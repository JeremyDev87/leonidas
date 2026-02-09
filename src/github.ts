import * as core from "@actions/core";
import * as github from "@actions/github";
import { PLAN_HEADER, PLAN_MARKER, DECOMPOSED_MARKER } from "./templates/plan_comment";
import { SubIssueMetadata } from "./types";

function createOctokit(token: string) {
  return github.getOctokit(token);
}

// Trusted bot authors that can create plan comments
// github-actions[bot] is used when GITHUB_TOKEN is a standard GitHub Actions token
// Other bot identifiers may be added for GitHub App installations
const TRUSTED_BOT_AUTHORS = new Set(["github-actions[bot]"]);

export async function findPlanComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string | null> {
  const octokit = createOctokit(token);
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  // Filter to comments authored by trusted bots to prevent spoofed plan injection
  const trustedComments = comments.filter(
    (comment) => comment.user && TRUSTED_BOT_AUTHORS.has(comment.user.login),
  );

  // First try to find comments with the language-agnostic marker
  let planComments = trustedComments.filter((comment) => comment.body?.includes(PLAN_MARKER));

  // Fallback to English header for backward compatibility
  if (planComments.length === 0) {
    planComments = trustedComments.filter((comment) => comment.body?.includes(PLAN_HEADER));
  }

  // If no trusted bot comments found, fall back to any comment (for backward compat
  // with repos where the bot identity differs, e.g., custom GitHub App installations)
  if (planComments.length === 0) {
    planComments = comments.filter((comment) => comment.body?.includes(PLAN_MARKER));
  }
  if (planComments.length === 0) {
    planComments = comments.filter((comment) => comment.body?.includes(PLAN_HEADER));
  }

  if (planComments.length === 0) {
    return null;
  }

  return planComments[planComments.length - 1].body ?? null;
}

export function parseSubIssueMetadata(issueBody: string): SubIssueMetadata | undefined {
  const parentMatch = /<!--\s*leonidas-parent:\s*#(\d+)\s*-->/.exec(issueBody);
  const orderMatch = /<!--\s*leonidas-order:\s*(\d+)\/(\d+)\s*-->/.exec(issueBody);

  if (!parentMatch || !orderMatch) {
    return undefined;
  }

  const metadata: SubIssueMetadata = {
    parent_issue_number: parseInt(parentMatch[1], 10),
    order: parseInt(orderMatch[1], 10),
    total: parseInt(orderMatch[2], 10),
  };

  const dependsMatch = /<!--\s*leonidas-depends:\s*#(\d+)\s*-->/.exec(issueBody);
  if (dependsMatch) {
    metadata.depends_on = parseInt(dependsMatch[1], 10);
  }

  return metadata;
}

export function isDecomposedPlan(planComment: string): boolean {
  return planComment.includes(DECOMPOSED_MARKER);
}

export async function isIssueClosed(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<boolean> {
  try {
    const octokit = createOctokit(token);
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    return issue.state === "closed";
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      throw new Error(`Dependency issue #${issueNumber} not found in ${owner}/${repo}.`);
    }
    throw new Error(
      `Failed to check issue #${issueNumber} status: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export async function postComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const octokit = createOctokit(token);
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export interface LinkSubIssuesResult {
  linked: number;
  failed: number;
}

export async function linkSubIssues(
  token: string,
  owner: string,
  repo: string,
  parentIssueNumber: number,
  subIssueNumbers: number[],
): Promise<LinkSubIssuesResult> {
  const octokit = createOctokit(token);
  let linked = 0;
  let failed = 0;

  for (const subNum of subIssueNumbers) {
    try {
      const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: subNum,
      });

      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues", {
        owner,
        repo,
        issue_number: parentIssueNumber,
        sub_issue_id: issue.id,
      });
      linked++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to link sub-issue #${subNum} to parent #${parentIssueNumber}: ${message}`);
      failed++;
    }
  }

  return { linked, failed };
}

/**
 * Gets the PR number for a given branch
 */
export async function getPRForBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<number | undefined> {
  const octokit = createOctokit(token);
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "all",
  });
  return prs.length > 0 ? prs[0].number : undefined;
}

/**
 * Checks if a branch exists on the remote
 */
export async function branchExistsOnRemote(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<boolean> {
  const octokit = createOctokit(token);
  try {
    await octokit.rest.repos.getBranch({ owner, repo, branch: branchName });
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a draft PR and returns the URL
 */
export async function createDraftPR(
  token: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<string | undefined> {
  const octokit = createOctokit(token);
  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
      draft: true,
    });
    return pr.html_url;
  } catch {
    return undefined;
  }
}

/**
 * Post-processes a PR: copies labels from issue (excluding 'leonidas') and adds assignee
 */
export async function postProcessPR(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  branchPrefix: string,
): Promise<void> {
  const octokit = createOctokit(token);
  const branchName = `${branchPrefix}${issueNumber}`;

  const prNumber = await getPRForBranch(token, owner, repo, branchName);
  if (!prNumber) {
    core.info(`No PR found for branch ${branchName}, skipping post-processing.`);
    return;
  }

  core.info(`Post-processing PR #${prNumber}...`);

  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const labels = (issue.labels || [])
    .map((l) => (typeof l === "string" ? l : l.name))
    .filter((name): name is string => !!name && name !== "leonidas");

  if (labels.length > 0) {
    core.info(`Adding labels: ${labels.join(", ")}`);
    try {
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels,
      });
    } catch {
      core.warning(`Failed to add labels to PR #${prNumber}`);
    }
  }

  const author = issue.user?.login;
  if (author) {
    core.info(`Adding assignee: ${author}`);
    try {
      await octokit.rest.issues.addAssignees({
        owner,
        repo,
        issue_number: prNumber,
        assignees: [author],
      });
    } catch {
      core.warning(`Failed to add assignee to PR #${prNumber}`);
    }
  }
}

/**
 * Triggers CI workflow on a branch
 */
export async function triggerCI(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  workflowFile = "ci.yml",
): Promise<void> {
  const octokit = createOctokit(token);

  const exists = await branchExistsOnRemote(token, owner, repo, branchName);
  if (!exists) {
    core.info(`Branch ${branchName} not found on remote, skipping CI trigger.`);
    return;
  }

  core.info(`Triggering CI workflow on branch ${branchName}...`);
  try {
    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflowFile,
      ref: branchName,
    });
  } catch {
    core.info(
      "Note: Could not trigger CI via workflow_dispatch. CI may need to be triggered manually.",
    );
  }
}
