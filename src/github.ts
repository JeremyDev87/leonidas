import * as github from "@actions/github";
import { PLAN_HEADER, DECOMPOSED_MARKER } from "./templates/plan_comment";
import { SubIssueMetadata } from "./types";

export async function findPlanComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string | null> {
  const octokit = github.getOctokit(token);
  const comments = await octokit.paginate(
    octokit.rest.issues.listComments,
    {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    },
  );

  const planComments = comments.filter(
    (comment) => comment.body?.includes(PLAN_HEADER),
  );

  if (planComments.length === 0) {
    return null;
  }

  return planComments[planComments.length - 1].body ?? null;
}

export function parseSubIssueMetadata(issueBody: string): SubIssueMetadata | null {
  const parentMatch = issueBody.match(/<!--\s*leonidas-parent:\s*#(\d+)\s*-->/);
  const orderMatch = issueBody.match(/<!--\s*leonidas-order:\s*(\d+)\/(\d+)\s*-->/);

  if (!parentMatch || !orderMatch) {
    return null;
  }

  const metadata: SubIssueMetadata = {
    parent_issue_number: parseInt(parentMatch[1], 10),
    order: parseInt(orderMatch[1], 10),
    total: parseInt(orderMatch[2], 10),
  };

  const dependsMatch = issueBody.match(/<!--\s*leonidas-depends:\s*#(\d+)\s*-->/);
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
  const octokit = github.getOctokit(token);
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return issue.state === "closed";
}

export async function postComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const octokit = github.getOctokit(token);
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}
