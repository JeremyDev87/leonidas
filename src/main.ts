import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ActionInputs, GitHubContext, LeonidasMode } from "./types";
import { resolveConfig, loadRules } from "./config";
import { buildSystemPrompt } from "./prompts/system";
import { buildPlanPrompt, buildSubIssuePlanPrompt } from "./prompts/plan";
import { buildExecutePrompt } from "./prompts/execute";
import { createGitHubClient, parseSubIssueMetadata, isDecomposedPlan } from "./github";
import type { GitHubClient } from "./github";

function isValidLeonidasMode(value: string): value is LeonidasMode {
  return value === "plan" || value === "execute";
}

export function readInputs(): ActionInputs {
  const modeRaw = core.getInput("mode", { required: true });
  if (!isValidLeonidasMode(modeRaw)) {
    throw new Error(`Invalid mode: ${modeRaw}. Must be "plan" or "execute".`);
  }
  const mode: LeonidasMode = modeRaw;

  const maxTurnsRaw = core.getInput("max_turns");
  let maxTurns: number | undefined;
  if (maxTurnsRaw) {
    maxTurns = parseInt(maxTurnsRaw, 10);
    if (isNaN(maxTurns)) {
      throw new Error(`Invalid max_turns value: "${maxTurnsRaw}"`);
    }
  }

  return {
    mode,
    anthropic_api_key: core.getInput("anthropic_api_key", { required: true }),
    github_token: core.getInput("github_token", { required: true }),
    model: core.getInput("model") || undefined,
    max_turns: maxTurns,
    allowed_tools: core.getInput("allowed_tools") || undefined,
    branch_prefix: core.getInput("branch_prefix") || undefined,
    base_branch: core.getInput("base_branch") || undefined,
    language: core.getInput("language") || undefined,
    config_path: core.getInput("config_path") || "leonidas.config.yml",
    system_prompt_path: core.getInput("system_prompt_path") || ".github/leonidas.md",
    rules_path: core.getInput("rules_path") || undefined,
  };
}

export function readGitHubContext(): GitHubContext {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH not set");
  }

  const event = JSON.parse(fs.readFileSync(eventPath, "utf-8")) as {
    issue?: {
      number: number;
      title: string;
      body?: string;
      labels?: { name: string }[];
      user?: { login: string };
    };
    comment?: {
      author_association?: string;
    };
  };
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!owner || !repo) {
    throw new Error("GITHUB_REPOSITORY is not set or malformed (expected 'owner/repo')");
  }

  const issue = event.issue;
  if (!issue) {
    throw new Error("No issue found in GitHub event payload");
  }

  return {
    owner,
    repo,
    issue_number: issue.number,
    issue_title: issue.title,
    issue_body: issue.body ?? "",
    issue_labels: (issue.labels ?? []).map((l) => l.name),
    issue_author: issue.user?.login ?? "",
    comment_author_association: event.comment?.author_association ?? "",
  };
}

interface ModeResult {
  prompt: string;
  allowedTools: string;
  maxTurns: number;
}

export function handlePlanMode(
  inputs: ActionInputs,
  config: ReturnType<typeof resolveConfig>,
  context: GitHubContext,
  systemPrompt: string,
  subIssueMetadata: ReturnType<typeof parseSubIssueMetadata>,
  repoFullName: string,
): ModeResult {
  // Plan mode turn limits:
  // - Sub-issue plans: capped at 10 (scope is narrow, no decomposition)
  // - Regular plans with decomposition: capped at 20 (needs turns for analysis + gh issue create)
  // These caps exist because plan mode is read-only analysis; config.max_turns is for execute mode.
  const SUB_ISSUE_PLAN_MAX_TURNS = 10;
  const REGULAR_PLAN_MAX_TURNS = 20;

  let prompt: string;
  let allowedTools: string;
  let maxTurns: number;

  if (subIssueMetadata) {
    prompt = buildSubIssuePlanPrompt(
      context.issue_title,
      context.issue_body,
      context.issue_number,
      repoFullName,
      systemPrompt,
      subIssueMetadata,
      config.language,
    );
    allowedTools = "Read,Bash(gh issue comment:*),Bash(find:*),Bash(ls:*),Bash(cat:*)";
    maxTurns = SUB_ISSUE_PLAN_MAX_TURNS;
  } else {
    prompt = buildPlanPrompt(
      context.issue_title,
      context.issue_body,
      context.issue_number,
      repoFullName,
      systemPrompt,
      config.label,
      config.language,
    );
    allowedTools =
      "Read,Bash(gh issue comment:*),Bash(gh issue create:*),Bash(gh api:*),Bash(find:*),Bash(ls:*),Bash(cat:*)";
    maxTurns = REGULAR_PLAN_MAX_TURNS;
  }

  return { prompt, allowedTools, maxTurns };
}

export async function handleExecuteMode(
  client: GitHubClient,
  inputs: ActionInputs,
  config: ReturnType<typeof resolveConfig>,
  context: GitHubContext,
  systemPrompt: string,
  subIssueMetadata: ReturnType<typeof parseSubIssueMetadata>,
  rules: Record<string, string>,
): Promise<ModeResult | null> {
  // execute mode — authorization check (defense-in-depth)
  if (
    config.authorized_approvers.length > 0 &&
    !config.authorized_approvers.includes(context.comment_author_association)
  ) {
    await client.postComment(
      context.issue_number,
      `⛔ **Leonidas**: Unauthorized approver. Only users with roles [${config.authorized_approvers.join(", ")}] can approve execution. Your role: \`${context.comment_author_association || "NONE"}\`.`,
    );
    core.setFailed(
      `Unauthorized: comment author_association "${context.comment_author_association}" is not in authorized_approvers [${config.authorized_approvers.join(", ")}].`,
    );
    return null;
  }

  const planComment = await client.findPlanComment(context.issue_number);

  if (!planComment) {
    core.setFailed(`No plan comment found on issue #${context.issue_number}. Run plan mode first.`);
    return null;
  }

  // Block execution on decomposed parent issues
  if (isDecomposedPlan(planComment)) {
    await client.postComment(
      context.issue_number,
      "⚠️ **Leonidas**: This issue has been decomposed into sub-issues. Please approve and execute each sub-issue individually instead of this parent issue.",
    );
    core.setFailed("Cannot execute a decomposed parent issue. Execute sub-issues individually.");
    return null;
  }

  // Check dependency for sub-issues
  if (subIssueMetadata?.depends_on) {
    const depClosed = await client.isIssueClosed(subIssueMetadata.depends_on);
    if (!depClosed) {
      await client.postComment(
        context.issue_number,
        `⏳ **Leonidas**: This sub-issue depends on #${subIssueMetadata.depends_on} which is not yet closed. Please complete #${subIssueMetadata.depends_on} first.`,
      );
      core.setFailed(`Dependency #${subIssueMetadata.depends_on} is not yet closed.`);
      return null;
    }
  }

  await client.postComment(
    context.issue_number,
    `⚡ **Leonidas** is starting implementation for issue #${context.issue_number}...`,
  );

  const prompt = buildExecutePrompt({
    issueTitle: context.issue_title,
    issueBody: context.issue_body,
    planComment,
    issueNumber: context.issue_number,
    branchPrefix: config.branch_prefix,
    baseBranch: config.base_branch,
    systemPrompt,
    maxTurns: config.max_turns,
    issueLabels: context.issue_labels,
    issueAuthor: context.issue_author,
    subIssueMetadata,
    hasRules: Object.keys(rules).length > 0,
  });
  const allowedTools = config.allowed_tools.join(",");
  const maxTurns = config.max_turns;

  return { prompt, allowedTools, maxTurns };
}

export async function run(): Promise<void> {
  try {
    const inputs = readInputs();
    const config = resolveConfig(inputs);
    const context = readGitHubContext();
    const repoFullName = `${context.owner}/${context.repo}`;

    const rules = loadRules(config.rules_path);
    const systemPrompt = buildSystemPrompt(inputs.system_prompt_path, config.language, rules);
    const subIssueMetadata = parseSubIssueMetadata(context.issue_body);

    // Create GitHub client for execute mode
    const client = createGitHubClient({
      token: inputs.github_token,
      owner: context.owner,
      repo: context.repo,
    });

    // Route to appropriate mode handler
    const result =
      inputs.mode === "plan"
        ? handlePlanMode(inputs, config, context, systemPrompt, subIssueMetadata, repoFullName)
        : await handleExecuteMode(
            client,
            inputs,
            config,
            context,
            systemPrompt,
            subIssueMetadata,
            rules,
          );

    if (!result) {
      return; // Early exit for execute mode failures
    }

    const { prompt, allowedTools, maxTurns } = result;

    // Write prompt to temp file to avoid shell escaping issues
    // Prefer RUNNER_TEMP (cleaned per-job by GitHub Actions) over os.tmpdir()
    const tmpDir = process.env.RUNNER_TEMP ?? os.tmpdir();
    const promptFile = path.join(tmpDir, `leonidas-prompt-${Date.now()}.md`);
    fs.writeFileSync(promptFile, prompt, "utf-8");

    // Set outputs for composite action
    core.setOutput("prompt_file", promptFile);
    core.setOutput("model", config.model);
    core.setOutput("max_turns", maxTurns.toString());
    core.setOutput("allowed_tools", allowedTools);
    core.setOutput("branch_prefix", config.branch_prefix);
    core.setOutput("base_branch", config.base_branch);
    core.setOutput("language", config.language);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
