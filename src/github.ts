import * as core from "@actions/core";
import * as github from "@actions/github";
import { PLAN_HEADER, PLAN_MARKER, DECOMPOSED_MARKER } from "./templates/plan_comment";
import { SubIssueMetadata, GitHubRepo } from "./types";

// Trusted bot authors that can create plan comments
// github-actions[bot] is used when GITHUB_TOKEN is a standard GitHub Actions token
// Other bot identifiers may be added for GitHub App installations
const TRUSTED_BOT_AUTHORS = new Set(["github-actions[bot]"]);

export interface LinkSubIssuesResult {
  linked: number;
  failed: number;
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

export function createGitHubClient(repo: GitHubRepo) {
  const octokit = github.getOctokit(repo.token);
  const { owner, repo: repoName } = repo;

  return {
    async findPlanComment(issueNumber: number): Promise<string | null> {
      const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo: repoName,
        issue_number: issueNumber,
        per_page: 100,
      });

      const trustedComments = comments.filter(
        (comment) => comment.user && TRUSTED_BOT_AUTHORS.has(comment.user.login),
      );

      let planComments = trustedComments.filter((comment) => comment.body?.includes(PLAN_MARKER));

      if (planComments.length === 0) {
        planComments = trustedComments.filter((comment) => comment.body?.includes(PLAN_HEADER));
      }

      if (planComments.length === 0) {
        return null;
      }

      return planComments[planComments.length - 1].body ?? null;
    },

    async isIssueClosed(issueNumber: number): Promise<boolean> {
      try {
        const { data: issue } = await octokit.rest.issues.get({
          owner,
          repo: repoName,
          issue_number: issueNumber,
        });
        return issue.state === "closed";
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          throw new Error(`Dependency issue #${issueNumber} not found in ${owner}/${repoName}.`);
        }
        throw new Error(
          `Failed to check issue #${issueNumber} status: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    },

    async postComment(issueNumber: number, body: string): Promise<void> {
      await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issueNumber,
        body,
      });
    },

    async linkSubIssues(
      parentIssueNumber: number,
      subIssueNumbers: number[],
    ): Promise<LinkSubIssuesResult> {
      let linked = 0;
      let failed = 0;

      for (const subNum of subIssueNumbers) {
        try {
          const { data: issue } = await octokit.rest.issues.get({
            owner,
            repo: repoName,
            issue_number: subNum,
          });

          await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues", {
            owner,
            repo: repoName,
            issue_number: parentIssueNumber,
            sub_issue_id: issue.id,
          });
          linked++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          core.warning(
            `Failed to link sub-issue #${subNum} to parent #${parentIssueNumber}: ${message}`,
          );
          failed++;
        }
      }

      return { linked, failed };
    },

    async getPRForBranch(branchName: string): Promise<number | undefined> {
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        head: `${owner}:${branchName}`,
        state: "all",
      });
      return prs.length > 0 ? prs[0].number : undefined;
    },

    async branchExistsOnRemote(branchName: string): Promise<boolean> {
      try {
        await octokit.rest.repos.getBranch({ owner, repo: repoName, branch: branchName });
        return true;
      } catch {
        return false;
      }
    },

    async createDraftPR(
      head: string,
      base: string,
      title: string,
      body: string,
    ): Promise<string | undefined> {
      try {
        const { data: pr } = await octokit.rest.pulls.create({
          owner,
          repo: repoName,
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

    async postProcessPR(issueNumber: number, branchPrefix: string): Promise<void> {
      const branchName = `${branchPrefix}${issueNumber}`;

      const prNumber = await this.getPRForBranch(branchName);
      if (!prNumber) {
        core.info(`No PR found for branch ${branchName}, skipping post-processing.`);
        return;
      }

      core.info(`Post-processing PR #${prNumber}...`);

      const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo: repoName,
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
            repo: repoName,
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
            repo: repoName,
            issue_number: prNumber,
            assignees: [author],
          });
        } catch {
          core.warning(`Failed to add assignee to PR #${prNumber}`);
        }
      }
    },

    async triggerCI(branchName: string, workflowFile = "ci.yml"): Promise<void> {
      const exists = await this.branchExistsOnRemote(branchName);
      if (!exists) {
        core.info(`Branch ${branchName} not found on remote, skipping CI trigger.`);
        return;
      }

      core.info(`Triggering CI workflow on branch ${branchName}...`);
      try {
        await octokit.rest.actions.createWorkflowDispatch({
          owner,
          repo: repoName,
          workflow_id: workflowFile,
          ref: branchName,
        });
      } catch {
        core.info(
          "Note: Could not trigger CI via workflow_dispatch. CI may need to be triggered manually.",
        );
      }
    },

    async getIssue(issueNumber: number) {
      const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo: repoName,
        issue_number: issueNumber,
      });
      return issue;
    },
  };
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
