import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ActionInputs, GitHubContext, LeonidasMode } from "./types";
import { resolveConfig } from "./config";
import { buildSystemPrompt } from "./prompts/system";
import { buildPlanPrompt } from "./prompts/plan";
import { buildExecutePrompt } from "./prompts/execute";
import { findPlanComment, postComment } from "./github";

function readInputs(): ActionInputs {
  const mode = core.getInput("mode", { required: true }) as LeonidasMode;
  if (mode !== "plan" && mode !== "execute") {
    throw new Error(`Invalid mode: ${mode}. Must be "plan" or "execute".`);
  }

  const maxTurnsRaw = core.getInput("max_turns");

  return {
    mode,
    anthropic_api_key: core.getInput("anthropic_api_key", { required: true }),
    github_token: core.getInput("github_token", { required: true }),
    model: core.getInput("model") || undefined,
    max_turns: maxTurnsRaw ? parseInt(maxTurnsRaw, 10) : undefined,
    allowed_tools: core.getInput("allowed_tools") || undefined,
    branch_prefix: core.getInput("branch_prefix") || undefined,
    base_branch: core.getInput("base_branch") || undefined,
    language: core.getInput("language") || undefined,
    config_path: core.getInput("config_path") || "leonidas.config.yml",
    system_prompt_path: core.getInput("system_prompt_path") || ".github/leonidas.md",
  };
}

function readGitHubContext(): GitHubContext {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH not set");
  }

  const event = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
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
  };
}

async function run(): Promise<void> {
  try {
    const inputs = readInputs();
    const config = resolveConfig(inputs);
    const context = readGitHubContext();
    const repoFullName = `${context.owner}/${context.repo}`;

    const systemPrompt = buildSystemPrompt(inputs.system_prompt_path);

    let prompt: string;
    let allowedTools: string;
    let maxTurns: number;

    if (inputs.mode === "plan") {
      prompt = buildPlanPrompt(
        context.issue_title,
        context.issue_body,
        context.issue_number,
        repoFullName,
        systemPrompt,
      );
      allowedTools = "Read,Bash(gh issue comment:*),Bash(find:*),Bash(ls:*),Bash(cat:*)";
      maxTurns = 10;
    } else {
      // execute mode
      const planComment = await findPlanComment(
        inputs.github_token,
        context.owner,
        context.repo,
        context.issue_number,
      );

      if (!planComment) {
        core.setFailed(`No plan comment found on issue #${context.issue_number}. Run plan mode first.`);
        return;
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
      );
      allowedTools = config.allowed_tools.join(",");
      maxTurns = config.max_turns;
    }

    // Write prompt to temp file to avoid shell escaping issues
    const tmpDir = os.tmpdir();
    const promptFile = path.join(tmpDir, `leonidas-prompt-${Date.now()}.md`);
    fs.writeFileSync(promptFile, prompt, "utf-8");

    // Build claude args
    const claudeArgs = `--model ${config.model} --max-turns ${maxTurns} --allowedTools "${allowedTools}"`;

    // Set outputs for composite action
    core.setOutput("prompt_file", promptFile);
    core.setOutput("claude_args", claudeArgs);
    core.setOutput("model", config.model);
    core.setOutput("max_turns", maxTurns.toString());
    core.setOutput("allowed_tools", allowedTools);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

run();
