import * as github from "@actions/github";
import { PLAN_HEADER } from "./templates/plan_comment";

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
