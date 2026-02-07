import * as github from "@actions/github";
import { PLAN_HEADER, PLAN_MARKER, DECOMPOSED_MARKER } from "./templates/plan_comment";
import { SubIssueMetadata } from "./types";

function createOctokit(token: string) {
  return github.getOctokit(token);
}

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

  // First try to find comments with the language-agnostic marker
  let planComments = comments.filter((comment) => comment.body?.includes(PLAN_MARKER));

  // Fallback to English header for backward compatibility
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

export async function getPRDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: {
      format: "diff",
    },
  });
  return data as unknown as string;
}

export async function getPRChangedFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string[]> {
  const octokit = createOctokit(token);
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  return files.map((file) => file.filename);
}

export async function getPRDetails(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ title: string; baseBranch: string; headBranch: string }> {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  return {
    title: data.title,
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
  };
}
