import * as core from "@actions/core";
import * as github from "@actions/github";
import { PLAN_HEADER, PLAN_MARKER, DECOMPOSED_MARKER } from "./templates/plan_comment";
import { SubIssueMetadata, GitHubRepo, GitHubClient, LinkSubIssuesResult } from "./types";

function createOctokit(token: string) {
  return github.getOctokit(token);
}

// Trusted bot authors that can create plan comments
// github-actions[bot] is used when GITHUB_TOKEN is a standard GitHub Actions token
// Other bot identifiers may be added for GitHub App installations
const TRUSTED_BOT_AUTHORS = new Set(["github-actions[bot]"]);

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

/**
 * Factory function that creates a GitHubClient with a single shared Octokit instance.
 * All methods share the same Octokit, eliminating redundant instance creation.
 */
export function createGitHubClient(params: GitHubRepo): GitHubClient {
  const octokit = createOctokit(params.token);
  const { owner, repo } = params;

  const client: GitHubClient = {
    async findPlanComment(issueNumber) {
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
      let planComments = trustedComments.filter((comment) =>
        comment.body?.includes(PLAN_MARKER),
      );

      // Fallback to English header for backward compatibility
      if (planComments.length === 0) {
        planComments = trustedComments.filter((comment) =>
          comment.body?.includes(PLAN_HEADER),
        );
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
    },

    async isIssueClosed(issueNumber) {
      try {
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
    },

    async postComment(issueNumber, body) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
    },

    async linkSubIssues(parentIssueNumber, subIssueNumbers) {
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
        } catch {
          failed++;
        }
      }

      return { linked, failed };
    },

    async getPRForBranch(branchName) {
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${branchName}`,
        state: "all",
      });
      return prs.length > 0 ? prs[0].number : undefined;
    },

    async branchExistsOnRemote(branchName) {
      try {
        await octokit.rest.repos.getBranch({ owner, repo, branch: branchName });
        return true;
      } catch {
        return false;
      }
    },

    async createDraftPR(head, base, title, body) {
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
    },

    async postProcessPR(issueNumber, branchPrefix) {
      const branchName = `${branchPrefix}${issueNumber}`;

      const prNumber = await client.getPRForBranch(branchName);
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
    },

    async triggerCI(branchName, workflowFile = "ci.yml") {
      const exists = await client.branchExistsOnRemote(branchName);
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
    },

    async getIssueTitle(issueNumber) {
      const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });
      return issue.title;
    },
  };

  return client;
}

// ─── Legacy standalone wrappers (backward compatibility) ────────────────────
// These delegate to createGitHubClient for backward compatibility during migration.
// They will be removed in a subsequent commit.

export async function findPlanComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<string | null> {
  return createGitHubClient({ token, owner, repo }).findPlanComment(issueNumber);
}

export async function isIssueClosed(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<boolean> {
  return createGitHubClient({ token, owner, repo }).isIssueClosed(issueNumber);
}

export async function postComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  return createGitHubClient({ token, owner, repo }).postComment(issueNumber, body);
}

export async function linkSubIssues(
  token: string,
  owner: string,
  repo: string,
  parentIssueNumber: number,
  subIssueNumbers: number[],
): Promise<LinkSubIssuesResult> {
  return createGitHubClient({ token, owner, repo }).linkSubIssues(
    parentIssueNumber,
    subIssueNumbers,
  );
}

export async function getPRForBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<number | undefined> {
  return createGitHubClient({ token, owner, repo }).getPRForBranch(branchName);
}

export async function branchExistsOnRemote(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<boolean> {
  return createGitHubClient({ token, owner, repo }).branchExistsOnRemote(branchName);
}

export async function createDraftPR(
  token: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<string | undefined> {
  return createGitHubClient({ token, owner, repo }).createDraftPR(head, base, title, body);
}

export async function postProcessPR(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  branchPrefix: string,
): Promise<void> {
  return createGitHubClient({ token, owner, repo }).postProcessPR(issueNumber, branchPrefix);
}

export async function triggerCI(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  workflowFile = "ci.yml",
): Promise<void> {
  return createGitHubClient({ token, owner, repo }).triggerCI(branchName, workflowFile);
}
