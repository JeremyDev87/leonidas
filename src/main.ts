import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ActionInputs, GitHubContext, LeonidasMode } from "./types";
import { resolveConfig, loadRules } from "./config";
import { buildSystemPrompt } from "./prompts/system";
import { buildPlanPrompt, buildSubIssuePlanPrompt } from "./prompts/plan";
import { buildExecutePrompt } from "./prompts/execute";
import {
  findPlanComment,
  postComment,
  parseSubIssueMetadata,
  isDecomposedPlan,
  isIssueClosed,
} from "./github";

function readInputs(): ActionInputs {
  const modeRaw = core.getInput("mode", { required: true });
  if (modeRaw !== "plan" && modeRaw !== "execute") {
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

function readGitHubContext(): GitHubContext {
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
  };
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");

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
  };
}

async function run(): Promise<void> {
  try {
    const inputs = readInputs();
    const config = resolveConfig(inputs);
    const context = readGitHubContext();
    const repoFullName = `${context.owner}/${context.repo}`;

    const rules = loadRules(config.rules_path);
    const systemPrompt = buildSystemPrompt(inputs.system_prompt_path, config.language, rules);
    const subIssueMetadata = parseSubIssueMetadata(context.issue_body);

    let prompt: string;
    let allowedTools: string;
    let maxTurns: number;

    if (inputs.mode === "plan") {
      // Plan mode turn limits:
      // - Sub-issue plans: capped at 10 (scope is narrow, no decomposition)
      // - Regular plans with decomposition: capped at 20 (needs turns for analysis + gh issue create)
      // These caps exist because plan mode is read-only analysis; config.max_turns is for execute mode.
      const SUB_ISSUE_PLAN_MAX_TURNS = 10;
      const REGULAR_PLAN_MAX_TURNS = 20;

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
    } else {
      // execute mode
      const planComment = await findPlanComment(
        inputs.github_token,
        context.owner,
        context.repo,
        context.issue_number,
      );

      if (!planComment) {
        core.setFailed(
          `No plan comment found on issue #${context.issue_number}. Run plan mode first.`,
        );
        return;
      }

      // Block execution on decomposed parent issues
      if (isDecomposedPlan(planComment)) {
        await postComment(
          inputs.github_token,
          context.owner,
          context.repo,
          context.issue_number,
          "⚠️ **Leonidas**: This issue has been decomposed into sub-issues. Please approve and execute each sub-issue individually instead of this parent issue.",
        );
        core.setFailed(
          "Cannot execute a decomposed parent issue. Execute sub-issues individually.",
        );
        return;
      }

      // Check dependency for sub-issues
      if (subIssueMetadata?.depends_on) {
        const depClosed = await isIssueClosed(
          inputs.github_token,
          context.owner,
          context.repo,
          subIssueMetadata.depends_on,
        );
        if (!depClosed) {
          await postComment(
            inputs.github_token,
            context.owner,
            context.repo,
            context.issue_number,
            `⏳ **Leonidas**: This sub-issue depends on #${subIssueMetadata.depends_on} which is not yet closed. Please complete #${subIssueMetadata.depends_on} first.`,
          );
          core.setFailed(`Dependency #${subIssueMetadata.depends_on} is not yet closed.`);
          return;
        }
      }

      await postComment(
        inputs.github_token,
        context.owner,
        context.repo,
        context.issue_number,
        `⚡ **Leonidas** is starting implementation for issue #${context.issue_number}...`,
      );

      prompt = buildExecutePrompt(
        context.issue_title,
        context.issue_body,
        planComment,
        context.issue_number,
        config.branch_prefix,
        config.base_branch,
        systemPrompt,
        config.max_turns,
        context.issue_labels,
        context.issue_author,
        subIssueMetadata,
        Object.keys(rules).length > 0,
        config.language,
      );
      allowedTools = config.allowed_tools.join(",");
      maxTurns = config.max_turns;
    }

    // Write prompt to temp file to avoid shell escaping issues
    const tmpDir = os.tmpdir();
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

void run();
