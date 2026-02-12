import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as github from "@actions/github";
import * as core from "@actions/core";
import { parseSubIssueMetadata, isDecomposedPlan, createGitHubClient } from "./github";
import { PLAN_HEADER, PLAN_MARKER, DECOMPOSED_MARKER } from "./templates/plan_comment";

vi.mock("@actions/core");
vi.mock("@actions/github");

describe("github", () => {
  const mockToken = "ghp_test_token";
  const mockOwner = "test-owner";
  const mockRepo = "test-repo";
  const mockIssueNumber = 42;

  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      paginate: vi.fn(),
      rest: {
        issues: {
          listComments: vi.fn(),
          createComment: vi.fn(),
          get: vi.fn(),
          addLabels: vi.fn(),
          addAssignees: vi.fn(),
        },
        pulls: {
          list: vi.fn(),
          create: vi.fn(),
        },
        repos: {
          getBranch: vi.fn(),
        },
        actions: {
          createWorkflowDispatch: vi.fn(),
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findPlanComment", () => {
    it("should return the latest plan comment when multiple exist", async () => {
      const comments = [
        { id: 1, body: "Regular comment" },
        { id: 2, body: `${PLAN_HEADER}\n\nFirst plan` },
        { id: 3, body: "Another regular comment" },
        { id: 4, body: `${PLAN_HEADER}\n\nLatest plan` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(mockOctokit.paginate).toHaveBeenCalledWith(mockOctokit.rest.issues.listComments, {
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
        per_page: 100,
      });
      expect(result).toBe(`${PLAN_HEADER}\n\nLatest plan`);
    });

    it("should return null when no plan comment exists", async () => {
      const comments = [
        { id: 1, body: "Regular comment" },
        { id: 2, body: "Another regular comment" },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should return null when comment list is empty", async () => {
      mockOctokit.paginate.mockResolvedValue([]);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should handle comments with undefined body", async () => {
      const comments = [
        { id: 1, body: undefined },
        { id: 2, body: `${PLAN_HEADER}\n\nPlan with content` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_HEADER}\n\nPlan with content`);
    });

    it("should return null when plan comment has undefined body", async () => {
      mockOctokit.paginate.mockResolvedValue([{ id: 3, body: undefined }]);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should find plan comment in the middle of body text", async () => {
      const comments = [{ id: 1, body: `Some text before\n${PLAN_HEADER}\nSome text after` }];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`Some text before\n${PLAN_HEADER}\nSome text after`);
    });

    it("should find plan comment by PLAN_MARKER", async () => {
      const comments = [
        { id: 1, body: "Regular comment" },
        { id: 2, body: `${PLAN_MARKER}\n## Plan\n\nContent here` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_MARKER}\n## Plan\n\nContent here`);
    });

    it("should prefer PLAN_MARKER over PLAN_HEADER when both exist", async () => {
      const comments = [
        { id: 1, body: `${PLAN_HEADER}\n\nOld style plan` },
        { id: 2, body: `${PLAN_MARKER}\n## Plan\n\nNew style plan` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_MARKER}\n## Plan\n\nNew style plan`);
    });

    it("should return latest PLAN_MARKER comment when multiple exist", async () => {
      const comments = [
        { id: 1, body: `${PLAN_MARKER}\n## Plan\n\nFirst plan` },
        { id: 2, body: "Regular comment" },
        { id: 3, body: `${PLAN_MARKER}\n## Plan\n\nLatest plan` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_MARKER}\n## Plan\n\nLatest plan`);
    });

    it("should fallback to PLAN_HEADER when no PLAN_MARKER found", async () => {
      const comments = [
        { id: 1, body: "Regular comment" },
        { id: 2, body: `${PLAN_HEADER}\n\nPlan without marker` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_HEADER}\n\nPlan without marker`);
    });
  });

  describe("postComment", () => {
    it("should post a comment to the issue", async () => {
      const commentBody = "Test comment body";

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 123, body: commentBody },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postComment(mockIssueNumber, commentBody);

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
        body: commentBody,
      });
    });

    it("should handle empty comment body", async () => {
      const commentBody = "";

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 124, body: commentBody },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postComment(mockIssueNumber, commentBody);

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
        body: commentBody,
      });
    });

    it("should handle multiline comment body", async () => {
      const commentBody = "Line 1\nLine 2\nLine 3";

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 125, body: commentBody },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postComment(mockIssueNumber, commentBody);

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
        body: commentBody,
      });
    });
  });

  describe("parseSubIssueMetadata", () => {
    it("should parse valid metadata from issue body", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #123 -->
<!-- leonidas-order: 2/5 -->

Some content here`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toEqual({
        parent_issue_number: 123,
        order: 2,
        total: 5,
      });
    });

    it("should parse valid metadata with depends_on field", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #42 -->
<!-- leonidas-order: 3/4 -->
<!-- leonidas-depends: #99 -->

Some content here`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toEqual({
        parent_issue_number: 42,
        order: 3,
        total: 4,
        depends_on: 99,
      });
    });

    it("should return undefined for body without metadata", () => {
      const issueBody = `# Regular Issue

This is just a regular issue with no metadata`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toBeUndefined();
    });

    it("should return undefined when only parent comment exists", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #123 -->

Missing order comment`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toBeUndefined();
    });

    it("should return undefined when only order comment exists", () => {
      const issueBody = `# Test Issue
<!-- leonidas-order: 2/5 -->

Missing parent comment`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toBeUndefined();
    });

    it("should handle extra whitespace in metadata comments", () => {
      const issueBody = `# Test Issue
<!--   leonidas-parent:   #456   -->
<!--   leonidas-order:   1/3   -->
<!--   leonidas-depends:   #789   -->

Content with extra whitespace in comments`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toEqual({
        parent_issue_number: 456,
        order: 1,
        total: 3,
        depends_on: 789,
      });
    });

    it("should handle metadata comments in different order", () => {
      const issueBody = `# Test Issue
<!-- leonidas-order: 4/7 -->
<!-- leonidas-depends: #101 -->
<!-- leonidas-parent: #50 -->

Order of comments shouldn't matter`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toEqual({
        parent_issue_number: 50,
        order: 4,
        total: 7,
        depends_on: 101,
      });
    });

    it("should handle empty body", () => {
      const result = parseSubIssueMetadata("");

      expect(result).toBeUndefined();
    });

    it("should handle malformed HTML comments", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #abc -->
<!-- leonidas-order: x/y -->

Malformed numbers`;

      const result = parseSubIssueMetadata(issueBody);

      // Regex requires \d+ so non-numeric values won't match
      expect(result).toBeUndefined();
    });

    it("should use first match when multiple parent comments exist", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #111 -->
<!-- leonidas-parent: #222 -->
<!-- leonidas-order: 1/2 -->

Multiple parent comments`;

      const result = parseSubIssueMetadata(issueBody);

      // Regex exec returns first match
      expect(result?.parent_issue_number).toBe(111);
    });

    it("should parse large issue numbers correctly", () => {
      const issueBody = `# Test Issue
<!-- leonidas-parent: #999999 -->
<!-- leonidas-order: 10/20 -->

Large numbers`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toEqual({
        parent_issue_number: 999999,
        order: 10,
        total: 20,
      });
    });

    it("should handle depends comment without parent and order", () => {
      const issueBody = `# Test Issue
<!-- leonidas-depends: #99 -->

Only depends comment`;

      const result = parseSubIssueMetadata(issueBody);

      expect(result).toBeUndefined();
    });
  });

  describe("isDecomposedPlan", () => {
    it("should return true for plan comment containing DECOMPOSED_MARKER", () => {
      const planComment = `${PLAN_HEADER}

### Summary
This is a decomposed plan

${DECOMPOSED_MARKER}

More content here`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(true);
    });

    it("should return false for regular plan comment without DECOMPOSED_MARKER", () => {
      const planComment = `${PLAN_HEADER}

### Summary
This is a regular plan without decomposition marker

### Implementation Steps
- Step 1
- Step 2`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(false);
    });

    it("should return true when DECOMPOSED_MARKER is at the beginning", () => {
      const planComment = `${DECOMPOSED_MARKER}
${PLAN_HEADER}

Plan content`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(true);
    });

    it("should return true when DECOMPOSED_MARKER is at the end", () => {
      const planComment = `${PLAN_HEADER}

Plan content

${DECOMPOSED_MARKER}`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(true);
    });

    it("should return false for empty string", () => {
      const result = isDecomposedPlan("");

      expect(result).toBe(false);
    });

    it("should return false for string with similar but not exact marker", () => {
      const planComment = `${PLAN_HEADER}

<!-- leonidas decomposed -->
<!-- leonidas-decomposed-->
Not the exact marker`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(false);
    });

    it("should handle marker with surrounding whitespace", () => {
      const planComment = `${PLAN_HEADER}

   ${DECOMPOSED_MARKER}

Plan content`;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(true);
    });

    it("should return false for comment with only plan header", () => {
      const planComment = PLAN_HEADER;

      const result = isDecomposedPlan(planComment);

      expect(result).toBe(false);
    });
  });

  describe("isIssueClosed", () => {
    it("should return true for closed issue", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockResolvedValue({
        data: { state: "closed", number: mockIssueNumber },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.isIssueClosed(mockIssueNumber);

      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
      });
      expect(result).toBe(true);
    });

    it("should return false for open issue", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockResolvedValue({
        data: { state: "open", number: mockIssueNumber },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.isIssueClosed(mockIssueNumber);

      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
      });
      expect(result).toBe(false);
    });

    it("should throw specific error for 404 (issue not found)", async () => {
      const error = { status: 404, message: "Not Found" };
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue(error);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await expect(client.isIssueClosed(mockIssueNumber)).rejects.toThrow(
        `Dependency issue #${mockIssueNumber} not found in ${mockOwner}/${mockRepo}.`,
      );

      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
      });
    });

    it("should throw generic error for other API errors", async () => {
      const error = new Error("API rate limit exceeded");
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue(error);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await expect(client.isIssueClosed(mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status: API rate limit exceeded`,
      );

      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
      });
    });

    it("should throw generic error with unknown error type", async () => {
      const error = { someField: "not a standard error" };
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue(error);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await expect(client.isIssueClosed(mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status: unknown error`,
      );
    });

    it("should handle 403 forbidden error", async () => {
      const error = { status: 403, message: "Forbidden" };
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue(error);

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await expect(client.isIssueClosed(mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status:`,
      );
    });

    it("should handle string error message", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue("Network connection failed");

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await expect(client.isIssueClosed(mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status: unknown error`,
      );
    });

    it("should correctly identify closed issue with additional state fields", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockResolvedValue({
        data: {
          state: "closed",
          state_reason: "completed",
          number: mockIssueNumber,
        },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.isIssueClosed(mockIssueNumber);

      expect(result).toBe(true);
    });
  });

  describe("linkSubIssues", () => {
    it("links sub-issues to parent via API", async () => {
      mockOctokit.rest.issues.get = vi
        .fn()
        .mockResolvedValueOnce({ data: { id: 1001 } })
        .mockResolvedValueOnce({ data: { id: 1002 } });
      mockOctokit.request = vi.fn().mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.linkSubIssues(10, [36, 37]);

      expect(result).toEqual({ linked: 2, failed: 0 });
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledTimes(2);
      expect(mockOctokit.request).toHaveBeenCalledTimes(2);
      expect(mockOctokit.request).toHaveBeenCalledWith(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
        {
          owner: mockOwner,
          repo: mockRepo,
          issue_number: 10,
          sub_issue_id: 1001,
        },
      );
    });

    it("counts failures when API call fails", async () => {
      mockOctokit.rest.issues.get = vi
        .fn()
        .mockResolvedValueOnce({ data: { id: 1001 } })
        .mockRejectedValueOnce(new Error("Not found"));
      mockOctokit.request = vi.fn().mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.linkSubIssues(10, [36, 37]);

      expect(result).toEqual({ linked: 1, failed: 1 });
    });

    it("handles already-linked sub-issues gracefully", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockResolvedValueOnce({ data: { id: 1001 } });
      mockOctokit.request = vi.fn().mockRejectedValueOnce(new Error("Already linked"));

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.linkSubIssues(10, [36]);

      expect(result).toEqual({ linked: 0, failed: 1 });
    });

    it("returns zero counts for empty array", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.linkSubIssues(10, []);

      expect(result).toEqual({ linked: 0, failed: 0 });
    });
  });

  describe("getPRForBranch", () => {
    it("returns PR number when PR exists", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 99 }],
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.getPRForBranch("feature/branch");

      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        head: `${mockOwner}:feature/branch`,
        state: "all",
      });
      expect(result).toBe(99);
    });

    it("returns undefined when no PR exists", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.getPRForBranch("feature/branch");

      expect(result).toBeUndefined();
    });

    it("returns first PR number when multiple PRs exist", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 50 }, { number: 51 }],
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.getPRForBranch("feature/branch");

      expect(result).toBe(50);
    });
  });

  describe("branchExistsOnRemote", () => {
    it("returns true when branch exists", async () => {
      mockOctokit.rest.repos.getBranch.mockResolvedValue({
        data: { name: "feature/branch" },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.branchExistsOnRemote("feature/branch");

      expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        branch: "feature/branch",
      });
      expect(result).toBe(true);
    });

    it("returns false when branch does not exist", async () => {
      mockOctokit.rest.repos.getBranch.mockRejectedValue(new Error("Not found"));

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.branchExistsOnRemote("feature/nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("createDraftPR", () => {
    it("creates draft PR and returns URL", async () => {
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { html_url: "https://github.com/owner/repo/pull/10" },
      });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.createDraftPR("feature/branch", "main", "PR Title", "PR Body");

      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        head: "feature/branch",
        base: "main",
        title: "PR Title",
        body: "PR Body",
        draft: true,
      });
      expect(result).toBe("https://github.com/owner/repo/pull/10");
    });

    it("returns undefined on failure", async () => {
      mockOctokit.rest.pulls.create.mockRejectedValue(new Error("Conflict"));

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      const result = await client.createDraftPR("feature/branch", "main", "PR Title", "PR Body");

      expect(result).toBeUndefined();
    });
  });

  describe("postProcessPR", () => {
    it("copies labels and adds assignee from issue to PR", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 77 }],
      });
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          labels: [{ name: "bug" }, { name: "leonidas" }, { name: "enhancement" }],
          user: { login: "author-user" },
        },
      });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({});
      mockOctokit.rest.issues.addAssignees.mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postProcessPR(42, "leonidas/issue-");

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: 77,
        labels: ["bug", "enhancement"],
      });
      expect(mockOctokit.rest.issues.addAssignees).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: 77,
        assignees: ["author-user"],
      });
    });

    it("skips when no PR found for branch", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postProcessPR(42, "leonidas/issue-");

      expect(core.info).toHaveBeenCalledWith(
        "No PR found for branch leonidas/issue-42, skipping post-processing.",
      );
      expect(mockOctokit.rest.issues.get).not.toHaveBeenCalled();
    });

    it("handles label add failure gracefully", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 77 }],
      });
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          labels: [{ name: "bug" }],
          user: { login: "author-user" },
        },
      });
      mockOctokit.rest.issues.addLabels.mockRejectedValue(new Error("Forbidden"));
      mockOctokit.rest.issues.addAssignees.mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postProcessPR(42, "leonidas/issue-");

      expect(core.warning).toHaveBeenCalledWith("Failed to add labels to PR #77");
      expect(mockOctokit.rest.issues.addAssignees).toHaveBeenCalled();
    });

    it("handles assignee add failure gracefully", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 77 }],
      });
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          labels: [],
          user: { login: "author-user" },
        },
      });
      mockOctokit.rest.issues.addAssignees.mockRejectedValue(new Error("Forbidden"));

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postProcessPR(42, "leonidas/issue-");

      expect(core.warning).toHaveBeenCalledWith("Failed to add assignee to PR #77");
    });

    it("skips labels when issue has no labels besides leonidas", async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 77 }],
      });
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          labels: [{ name: "leonidas" }],
          user: { login: "author-user" },
        },
      });
      mockOctokit.rest.issues.addAssignees.mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.postProcessPR(42, "leonidas/issue-");

      expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
    });
  });

  describe("triggerCI", () => {
    it("triggers workflow dispatch on existing branch", async () => {
      mockOctokit.rest.repos.getBranch.mockResolvedValue({
        data: { name: "feature/branch" },
      });
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.triggerCI("feature/branch");

      expect(mockOctokit.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        workflow_id: "ci.yml",
        ref: "feature/branch",
      });
    });

    it("skips when branch does not exist", async () => {
      mockOctokit.rest.repos.getBranch.mockRejectedValue(new Error("Not found"));

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.triggerCI("feature/nonexistent");

      expect(core.info).toHaveBeenCalledWith(
        "Branch feature/nonexistent not found on remote, skipping CI trigger.",
      );
      expect(mockOctokit.rest.actions.createWorkflowDispatch).not.toHaveBeenCalled();
    });

    it("handles workflow dispatch failure gracefully", async () => {
      mockOctokit.rest.repos.getBranch.mockResolvedValue({
        data: { name: "feature/branch" },
      });
      mockOctokit.rest.actions.createWorkflowDispatch.mockRejectedValue(
        new Error("Workflow not found"),
      );

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.triggerCI("feature/branch");

      expect(core.info).toHaveBeenCalledWith(
        "Note: Could not trigger CI via workflow_dispatch. CI may need to be triggered manually.",
      );
    });

    it("uses custom workflow file when specified", async () => {
      mockOctokit.rest.repos.getBranch.mockResolvedValue({
        data: { name: "feature/branch" },
      });
      mockOctokit.rest.actions.createWorkflowDispatch.mockResolvedValue({});

      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });
      await client.triggerCI("feature/branch", "test.yml");

      expect(mockOctokit.rest.actions.createWorkflowDispatch).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        workflow_id: "test.yml",
        ref: "feature/branch",
      });
    });
  });

  describe("createGitHubClient", () => {
    it("should create a client that shares a single Octokit instance", () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      expect(github.getOctokit).toHaveBeenCalledWith(mockToken);
      expect(github.getOctokit).toHaveBeenCalledTimes(1);
      expect(client).toHaveProperty("findPlanComment");
      expect(client).toHaveProperty("postComment");
      expect(client).toHaveProperty("isIssueClosed");
      expect(client).toHaveProperty("linkSubIssues");
      expect(client).toHaveProperty("getPRForBranch");
      expect(client).toHaveProperty("branchExistsOnRemote");
      expect(client).toHaveProperty("createDraftPR");
      expect(client).toHaveProperty("postProcessPR");
      expect(client).toHaveProperty("triggerCI");
      expect(client).toHaveProperty("getIssue");
    });

    it("findPlanComment should use shared Octokit", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      const comments = [
        { id: 1, body: "Regular comment" },
        { id: 2, body: `${PLAN_HEADER}\n\nPlan content` },
      ];
      mockOctokit.paginate.mockResolvedValue(comments);

      const result = await client.findPlanComment(mockIssueNumber);

      expect(result).toBe(`${PLAN_HEADER}\n\nPlan content`);
      // getOctokit should only have been called once (during createGitHubClient)
      expect(github.getOctokit).toHaveBeenCalledTimes(1);
    });

    it("postComment should use shared Octokit", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 123, body: "test" },
      });

      await client.postComment(mockIssueNumber, "test body");

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
        body: "test body",
      });
      expect(github.getOctokit).toHaveBeenCalledTimes(1);
    });

    it("getPRForBranch should use shared Octokit", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [{ number: 42 }],
      });

      const result = await client.getPRForBranch("feature/test");

      expect(result).toBe(42);
      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        head: `${mockOwner}:feature/test`,
        state: "all",
      });
    });

    it("isIssueClosed should use shared Octokit", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      mockOctokit.rest.issues.get = vi.fn().mockResolvedValue({
        data: { state: "closed" },
      });

      const result = await client.isIssueClosed(mockIssueNumber);

      expect(result).toBe(true);
    });

    it("getIssue should return issue data", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      mockOctokit.rest.issues.get = vi.fn().mockResolvedValue({
        data: { title: "Test Issue", body: "body", user: { login: "user" } },
      });

      const issue = await client.getIssue(mockIssueNumber);

      expect(issue.title).toBe("Test Issue");
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: mockOwner,
        repo: mockRepo,
        issue_number: mockIssueNumber,
      });
    });

    it("multiple method calls should reuse same Octokit", async () => {
      const client = createGitHubClient({ token: mockToken, owner: mockOwner, repo: mockRepo });

      mockOctokit.paginate.mockResolvedValue([]);
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });

      await client.findPlanComment(1);
      await client.postComment(1, "test");
      await client.getPRForBranch("branch");

      // Only 1 getOctokit call total
      expect(github.getOctokit).toHaveBeenCalledTimes(1);
    });
  });
});
