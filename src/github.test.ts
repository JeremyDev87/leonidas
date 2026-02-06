import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as github from "@actions/github";
import { findPlanComment, postComment } from "./github";
import { PLAN_HEADER } from "./templates/plan_comment";

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
});
