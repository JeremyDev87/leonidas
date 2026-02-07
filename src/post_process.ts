import * as core from "@actions/core";
import * as github from "@actions/github";
import { resolveLanguage } from "./i18n";
import {
  buildCompletionComment,
  buildFailureComment,
  extractSubIssueNumbers,
} from "./post_processing";
import { findPlanComment, postComment, linkSubIssues, isDecomposedPlan } from "./github";
import { LeonidasMode } from "./types";

type Command = "link-subissues" | "post-completion" | "post-failure";

export function getEnvRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getEnvOptional(name: string): string | undefined {
  return process.env[name] ?? undefined;
}

export function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

async function runLinkSubIssues(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("REPO"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);

  const planComment = await findPlanComment(token, owner, repo, issueNumber);
  if (!planComment || !isDecomposedPlan(planComment)) {
    core.info("No decomposed plan found, skipping sub-issue linking.");
    return;
  }

  core.info(`Decomposed plan found. Linking sub-issues to parent #${issueNumber}...`);

  const subIssueNumbers = extractSubIssueNumbers(planComment);
  if (subIssueNumbers.length === 0) {
    core.info("No sub-issue numbers found in checklist.");
    return;
  }

  const result = await linkSubIssues(token, owner, repo, issueNumber, subIssueNumbers);
  core.info(
    `Sub-issue linking complete: ${result.linked} linked, ${result.failed} skipped/failed.`,
  );
}

async function runPostCompletion(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");
  const runUrl = getEnvRequired("RUN_URL");

  const branchName = `${branchPrefix}${issueNumber}`;
  const octokit = github.getOctokit(token);
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "open",
  });
  const prNumber = prs.length > 0 ? String(prs[0].number) : undefined;

  const comment = buildCompletionComment({
    issueNumber,
    prNumber,
    language,
    runUrl,
  });

  await postComment(token, owner, repo, issueNumber, comment);
}

async function runPostFailure(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const runUrl = getEnvRequired("RUN_URL");
  const mode = getEnvRequired("MODE") as LeonidasMode;

  const comment = buildFailureComment({
    issueNumber,
    mode,
    language,
    runUrl,
  });

  await postComment(token, owner, repo, issueNumber, comment);
}

export async function run(): Promise<void> {
  const command = process.argv[2] as Command;
  switch (command) {
    case "link-subissues":
      return runLinkSubIssues();
    case "post-completion":
      return runPostCompletion();
    case "post-failure":
      return runPostFailure();
    default:
      throw new Error(`Unknown post-process command: ${String(command)}`);
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
