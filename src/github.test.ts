import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as github from "@actions/github";
import { findPlanComment, postComment, parseSubIssueMetadata, isDecomposedPlan, isIssueClosed } from "./github";
import { PLAN_HEADER, DECOMPOSED_MARKER } from "./templates/plan_comment";

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

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(github.getOctokit).toHaveBeenCalledWith(mockToken);
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

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should return null when comment list is empty", async () => {
      mockOctokit.paginate.mockResolvedValue([]);

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should handle comments with undefined body", async () => {
      const comments = [
        { id: 1, body: undefined },
        { id: 2, body: `${PLAN_HEADER}\n\nPlan with content` },
      ];

      mockOctokit.paginate.mockResolvedValue(comments);

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBe(`${PLAN_HEADER}\n\nPlan with content`);
    });

    it("should return null when plan comment has undefined body", async () => {
      mockOctokit.paginate.mockResolvedValue([{ id: 3, body: undefined }]);

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBeNull();
    });

    it("should find plan comment in the middle of body text", async () => {
      const comments = [{ id: 1, body: `Some text before\n${PLAN_HEADER}\nSome text after` }];

      mockOctokit.paginate.mockResolvedValue(comments);

      const result = await findPlanComment(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBe(`Some text before\n${PLAN_HEADER}\nSome text after`);
    });
  });

  describe("postComment", () => {
    it("should post a comment to the issue", async () => {
      const commentBody = "Test comment body";

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 123, body: commentBody },
      });

      await postComment(mockToken, mockOwner, mockRepo, mockIssueNumber, commentBody);

      expect(github.getOctokit).toHaveBeenCalledWith(mockToken);
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

      await postComment(mockToken, mockOwner, mockRepo, mockIssueNumber, commentBody);

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

      await postComment(mockToken, mockOwner, mockRepo, mockIssueNumber, commentBody);

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

      const result = await isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(github.getOctokit).toHaveBeenCalledWith(mockToken);
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

      const result = await isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber);

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

      await expect(isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber)).rejects.toThrow(
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

      await expect(isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber)).rejects.toThrow(
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

      await expect(isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status: unknown error`,
      );
    });

    it("should handle 403 forbidden error", async () => {
      const error = { status: 403, message: "Forbidden" };
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue(error);

      await expect(isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber)).rejects.toThrow(
        `Failed to check issue #${mockIssueNumber} status:`,
      );
    });

    it("should handle string error message", async () => {
      mockOctokit.rest.issues.get = vi.fn().mockRejectedValue("Network connection failed");

      await expect(isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber)).rejects.toThrow(
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

      const result = await isIssueClosed(mockToken, mockOwner, mockRepo, mockIssueNumber);

      expect(result).toBe(true);
    });
  });
});
