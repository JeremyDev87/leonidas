import * as fs from "fs";
import * as core from "@actions/core";
import { resolveLanguage, SupportedLanguage } from "./i18n";
import {
  buildCompletionComment,
  buildFailureComment,
  buildPartialProgressComment,
  buildRescuePRTitle,
  buildRescuePRBody,
  extractSubIssueNumbers,
  extractParentIssueNumber,
} from "./comment_builder";
import { createGitHubClient, isDecomposedPlan } from "./github";
import { LeonidasMode } from "./types";

type Command =
  | "link-subissues"
  | "post-completion"
  | "post-failure"
  | "rescue"
  | "post-process-pr"
  | "trigger-ci";

export interface PostProcessContext {
  token: string;
  owner: string;
  repo: string;
  issueNumber: number;
  language: SupportedLanguage;
  branchPrefix: string;
  runUrl: string;
}

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

export function readBaseContext(): PostProcessContext {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");
  const runUrl = getEnvRequired("RUN_URL");

  return {
    token,
    owner,
    repo,
    issueNumber,
    language,
    branchPrefix,
    runUrl,
  };
}

async function runLinkSubIssues(): Promise<void> {
  // Note: This command uses REPO instead of GITHUB_REPOSITORY and doesn't need
  // language, branchPrefix, or runUrl, so it reads env vars directly
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("REPO"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);

  const client = createGitHubClient({ token, owner, repo });

  const planComment = await client.findPlanComment(issueNumber);
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

  const result = await client.linkSubIssues(issueNumber, subIssueNumbers);
  core.info(
    `Sub-issue linking complete: ${result.linked} linked, ${result.failed} skipped/failed.`,
  );
}

async function runPostCompletion(): Promise<void> {
  const { token, owner, repo, issueNumber, language, branchPrefix, runUrl } = readBaseContext();

  const client = createGitHubClient({ token, owner, repo });
  const branchName = `${branchPrefix}${issueNumber}`;
  const prNumber = await client.getPRForBranch(branchName);

  const comment = buildCompletionComment({
    issueNumber,
    prNumber: prNumber ? String(prNumber) : undefined,
    language,
    runUrl,
  });

  await client.postComment(issueNumber, comment);
}

async function runPostFailure(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const runUrl = getEnvRequired("RUN_URL");
  const mode = getEnvRequired("MODE") as LeonidasMode;

  const client = createGitHubClient({ token, owner, repo });

  const comment = buildFailureComment({
    issueNumber,
    mode,
    language,
    runUrl,
  });

  await client.postComment(issueNumber, comment);
}

async function runRescue(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");
  const baseBranch = getEnvRequired("BASE_BRANCH");
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const runUrl = getEnvRequired("RUN_URL");
  const githubOutput = process.env.GITHUB_OUTPUT;

  const client = createGitHubClient({ token, owner, repo });
  const branchName = `${branchPrefix}${issueNumber}`;
  const exists = await client.branchExistsOnRemote(branchName);

  if (githubOutput) {
    fs.appendFileSync(githubOutput, `branch_exists=${exists ? "true" : "false"}\n`);
  }

  if (!exists) {
    core.info(`Branch ${branchName} not found on remote, skipping rescue.`);
    return;
  }

  const prNumber = await client.getPRForBranch(branchName);

  if (prNumber) {
    if (githubOutput) {
      fs.appendFileSync(githubOutput, "pr_exists=true\n");
      fs.appendFileSync(githubOutput, `pr_number=${prNumber}\n`);
    }

    const comment = buildPartialProgressComment({
      issueNumber,
      existingPR: String(prNumber),
      language,
      runUrl,
    });
    await client.postComment(issueNumber, comment);
  } else {
    const issue = await client.getIssue(issueNumber);

    const parentNumber = extractParentIssueNumber(issue.body ?? "");
    const title = buildRescuePRTitle({
      issueNumber,
      issueTitle: issue.title,
      parentNumber,
      language,
      runUrl,
    });
    const body = buildRescuePRBody({
      issueNumber,
      issueTitle: issue.title,
      parentNumber,
      language,
      runUrl,
    });

    const prUrl = await client.createDraftPR(branchName, baseBranch, title, body);

    if (prUrl) {
      if (githubOutput) {
        fs.appendFileSync(githubOutput, "pr_created=true\n");
      }

      const comment = buildPartialProgressComment({
        issueNumber,
        draftPRUrl: prUrl,
        language,
        runUrl,
      });
      await client.postComment(issueNumber, comment);
    }
  }
}

async function runPostProcessPR(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");

  const client = createGitHubClient({ token, owner, repo });
  await client.postProcessPR(issueNumber, branchPrefix);
}

async function runTriggerCI(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");

  const client = createGitHubClient({ token, owner, repo });
  const branchName = `${branchPrefix}${issueNumber}`;
  await client.triggerCI(branchName);
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
    case "rescue":
      return runRescue();
    case "post-process-pr":
      return runPostProcessPR();
    case "trigger-ci":
      return runTriggerCI();
    default:
      throw new Error(`Unknown post-process command: ${String(command)}`);
  }
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
