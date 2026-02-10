import * as fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { resolveLanguage } from "./i18n";
import {
  buildCompletionComment,
  buildFailureComment,
  buildPartialProgressComment,
  buildRescuePRTitle,
  buildRescuePRBody,
  extractSubIssueNumbers,
  extractParentIssueNumber,
} from "./post_processing";
import { createGitHubClient, isDecomposedPlan } from "./github";
import { LeonidasMode, GitHubRepo } from "./types";

type Command =
  | "link-subissues"
  | "post-completion"
  | "post-failure"
  | "rescue"
  | "post-process-pr"
  | "trigger-ci";

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

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

  const planComment = await githubClient.findPlanComment(issueNumber);
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

  const result = await githubClient.linkSubIssues(issueNumber, subIssueNumbers);
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

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

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

  await githubClient.postComment(issueNumber, comment);
}

async function runPostFailure(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const language = resolveLanguage(getEnvOptional("LANGUAGE"));
  const runUrl = getEnvRequired("RUN_URL");
  const mode = getEnvRequired("MODE") as LeonidasMode;

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

  const comment = buildFailureComment({
    issueNumber,
    mode,
    language,
    runUrl,
  });

  await githubClient.postComment(issueNumber, comment);
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

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

  const branchName = `${branchPrefix}${issueNumber}`;
  const exists = await githubClient.branchExistsOnRemote(branchName);

  if (githubOutput) {
    fs.appendFileSync(githubOutput, `branch_exists=${exists ? "true" : "false"}\n`);
  }

  if (!exists) {
    core.info(`Branch ${branchName} not found on remote, skipping rescue.`);
    return;
  }

  const prNumber = await githubClient.getPRForBranch(branchName);

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
    await githubClient.postComment(issueNumber, comment);
  } else {
    const octokit = github.getOctokit(token);
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

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

    const prUrl = await githubClient.createDraftPR(branchName, baseBranch, title, body);

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
      await githubClient.postComment(issueNumber, comment);
    }
  }
}

async function runPostProcessPR(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

  await githubClient.postProcessPR(issueNumber, branchPrefix);
}

async function runTriggerCI(): Promise<void> {
  const token = getEnvRequired("GH_TOKEN");
  const { owner, repo } = parseRepo(getEnvRequired("GITHUB_REPOSITORY"));
  const issueNumber = parseInt(getEnvRequired("ISSUE_NUMBER"), 10);
  const branchPrefix = getEnvRequired("BRANCH_PREFIX");

  const repoContext: GitHubRepo = { token, owner, repo };
  const githubClient = createGitHubClient(repoContext);

  const branchName = `${branchPrefix}${issueNumber}`;
  await githubClient.triggerCI(branchName);
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
