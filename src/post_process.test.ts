import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { getEnvRequired, getEnvOptional, parseRepo, run } from "./post_process";
import * as githubModule from "./github";
import * as postProcessingModule from "./post_processing";

vi.mock("fs");
vi.mock("@actions/core");
vi.mock("@actions/github");
vi.mock("./github");
vi.mock("./post_processing");

describe("post_process", () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe("getEnvRequired", () => {
    it("returns value when environment variable is set", () => {
      process.env.TEST_VAR = "test-value";
      expect(getEnvRequired("TEST_VAR")).toBe("test-value");
    });

    it("throws when environment variable is not set", () => {
      delete process.env.TEST_VAR;
      expect(() => getEnvRequired("TEST_VAR")).toThrow(
        "Required environment variable TEST_VAR is not set",
      );
    });

    it("throws when environment variable is empty string", () => {
      process.env.TEST_VAR = "";
      expect(() => getEnvRequired("TEST_VAR")).toThrow(
        "Required environment variable TEST_VAR is not set",
      );
    });
  });

  describe("getEnvOptional", () => {
    it("returns value when environment variable is set", () => {
      process.env.TEST_VAR = "test-value";
      expect(getEnvOptional("TEST_VAR")).toBe("test-value");
    });

    it("returns undefined when environment variable is not set", () => {
      delete process.env.TEST_VAR;
      expect(getEnvOptional("TEST_VAR")).toBeUndefined();
    });

    it("returns empty string when environment variable is empty string", () => {
      process.env.TEST_VAR = "";
      expect(getEnvOptional("TEST_VAR")).toBe("");
    });
  });

  describe("parseRepo", () => {
    it("correctly splits owner/repo", () => {
      expect(parseRepo("test-owner/test-repo")).toEqual({
        owner: "test-owner",
        repo: "test-repo",
      });
    });

    it("handles repo names with hyphens", () => {
      expect(parseRepo("my-org/my-awesome-repo")).toEqual({
        owner: "my-org",
        repo: "my-awesome-repo",
      });
    });
  });

  describe("run — link-subissues command", () => {
    it("calls findPlanComment and linkSubIssues when decomposed plan found", async () => {
      process.argv = ["node", "post_process.js", "link-subissues"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.REPO = "owner/repo";
      process.env.ISSUE_NUMBER = "42";

      const planBody = "<!-- leonidas-decomposed -->\n- [ ] #10 — Task 1\n- [ ] #11 — Task 2";
      vi.mocked(githubModule.findPlanComment).mockResolvedValue(planBody);
      vi.mocked(githubModule.isDecomposedPlan).mockReturnValue(true);
      vi.mocked(postProcessingModule.extractSubIssueNumbers).mockReturnValue([10, 11]);
      vi.mocked(githubModule.linkSubIssues).mockResolvedValue({ linked: 2, failed: 0 });

      await run();

      expect(githubModule.findPlanComment).toHaveBeenCalledWith("ghp_test", "owner", "repo", 42);
      expect(githubModule.isDecomposedPlan).toHaveBeenCalledWith(planBody);
      expect(postProcessingModule.extractSubIssueNumbers).toHaveBeenCalledWith(planBody);
      expect(githubModule.linkSubIssues).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        [10, 11],
      );
      expect(core.info).toHaveBeenCalledWith(
        "Sub-issue linking complete: 2 linked, 0 skipped/failed.",
      );
    });

    it("skips when no plan comment found", async () => {
      process.argv = ["node", "post_process.js", "link-subissues"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.REPO = "owner/repo";
      process.env.ISSUE_NUMBER = "42";

      vi.mocked(githubModule.findPlanComment).mockResolvedValue(null);

      await run();

      expect(core.info).toHaveBeenCalledWith(
        "No decomposed plan found, skipping sub-issue linking.",
      );
      expect(githubModule.linkSubIssues).not.toHaveBeenCalled();
    });

    it("skips when plan is not decomposed", async () => {
      process.argv = ["node", "post_process.js", "link-subissues"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.REPO = "owner/repo";
      process.env.ISSUE_NUMBER = "42";

      vi.mocked(githubModule.findPlanComment).mockResolvedValue("regular plan");
      vi.mocked(githubModule.isDecomposedPlan).mockReturnValue(false);

      await run();

      expect(core.info).toHaveBeenCalledWith(
        "No decomposed plan found, skipping sub-issue linking.",
      );
      expect(githubModule.linkSubIssues).not.toHaveBeenCalled();
    });

    it("skips when no sub-issue numbers found in checklist", async () => {
      process.argv = ["node", "post_process.js", "link-subissues"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.REPO = "owner/repo";
      process.env.ISSUE_NUMBER = "42";

      vi.mocked(githubModule.findPlanComment).mockResolvedValue("decomposed plan body");
      vi.mocked(githubModule.isDecomposedPlan).mockReturnValue(true);
      vi.mocked(postProcessingModule.extractSubIssueNumbers).mockReturnValue([]);

      await run();

      expect(core.info).toHaveBeenCalledWith("No sub-issue numbers found in checklist.");
      expect(githubModule.linkSubIssues).not.toHaveBeenCalled();
    });
  });

  describe("run — post-completion command", () => {
    it("posts completion comment with PR number when PR exists", async () => {
      process.argv = ["node", "post_process.js", "post-completion"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.LANGUAGE = "en";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.RUN_URL = "https://example.com/run";

      vi.mocked(githubModule.getPRForBranch).mockResolvedValue(99);
      vi.mocked(postProcessingModule.buildCompletionComment).mockReturnValue("completion msg");

      await run();

      expect(githubModule.getPRForBranch).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        "leonidas/issue-42",
      );
      expect(postProcessingModule.buildCompletionComment).toHaveBeenCalledWith({
        issueNumber: 42,
        prNumber: "99",
        language: "en",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.postComment).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "completion msg",
      );
    });

    it("posts completion comment without PR number when no PR exists", async () => {
      process.argv = ["node", "post_process.js", "post-completion"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.LANGUAGE = "ko";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.RUN_URL = "https://example.com/run";

      vi.mocked(githubModule.getPRForBranch).mockResolvedValue(undefined);
      vi.mocked(postProcessingModule.buildCompletionComment).mockReturnValue("no PR msg");

      await run();

      expect(postProcessingModule.buildCompletionComment).toHaveBeenCalledWith({
        issueNumber: 42,
        prNumber: undefined,
        language: "ko",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.postComment).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "no PR msg",
      );
    });
  });

  describe("run — post-failure command", () => {
    it("posts failure comment for plan mode", async () => {
      process.argv = ["node", "post_process.js", "post-failure"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.LANGUAGE = "en";
      process.env.RUN_URL = "https://example.com/run";
      process.env.MODE = "plan";

      vi.mocked(postProcessingModule.buildFailureComment).mockReturnValue("failure msg");

      await run();

      expect(postProcessingModule.buildFailureComment).toHaveBeenCalledWith({
        issueNumber: 42,
        mode: "plan",
        language: "en",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.postComment).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "failure msg",
      );
    });

    it("posts failure comment for execute mode", async () => {
      process.argv = ["node", "post_process.js", "post-failure"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.LANGUAGE = "ja";
      process.env.RUN_URL = "https://example.com/run";
      process.env.MODE = "execute";

      vi.mocked(postProcessingModule.buildFailureComment).mockReturnValue("exec failure msg");

      await run();

      expect(postProcessingModule.buildFailureComment).toHaveBeenCalledWith({
        issueNumber: 42,
        mode: "execute",
        language: "ja",
        runUrl: "https://example.com/run",
      });
    });
  });

  describe("run — rescue command", () => {
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = {
        rest: {
          issues: {
            get: vi.fn(),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    });

    it("sets branch_exists=false and skips when branch does not exist", async () => {
      process.argv = ["node", "post_process.js", "rescue"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.BASE_BRANCH = "main";
      process.env.LANGUAGE = "en";
      process.env.RUN_URL = "https://example.com/run";
      process.env.GITHUB_OUTPUT = "/tmp/test-output";

      vi.mocked(githubModule.branchExistsOnRemote).mockResolvedValue(false);

      await run();

      expect(githubModule.branchExistsOnRemote).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        "leonidas/issue-42",
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith("/tmp/test-output", "branch_exists=false\n");
      expect(core.info).toHaveBeenCalledWith(
        "Branch leonidas/issue-42 not found on remote, skipping rescue.",
      );
    });

    it("posts partial progress comment when branch exists and PR exists", async () => {
      process.argv = ["node", "post_process.js", "rescue"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.BASE_BRANCH = "main";
      process.env.LANGUAGE = "en";
      process.env.RUN_URL = "https://example.com/run";
      process.env.GITHUB_OUTPUT = "/tmp/test-output";

      vi.mocked(githubModule.branchExistsOnRemote).mockResolvedValue(true);
      vi.mocked(githubModule.getPRForBranch).mockResolvedValue(99);
      vi.mocked(postProcessingModule.buildPartialProgressComment).mockReturnValue("partial msg");

      await run();

      expect(fs.appendFileSync).toHaveBeenCalledWith("/tmp/test-output", "branch_exists=true\n");
      expect(fs.appendFileSync).toHaveBeenCalledWith("/tmp/test-output", "pr_exists=true\n");
      expect(fs.appendFileSync).toHaveBeenCalledWith("/tmp/test-output", "pr_number=99\n");
      expect(postProcessingModule.buildPartialProgressComment).toHaveBeenCalledWith({
        issueNumber: 42,
        existingPR: "99",
        language: "en",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.postComment).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "partial msg",
      );
    });

    it("creates draft PR when branch exists but no PR exists", async () => {
      process.argv = ["node", "post_process.js", "rescue"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.BASE_BRANCH = "main";
      process.env.LANGUAGE = "en";
      process.env.RUN_URL = "https://example.com/run";
      process.env.GITHUB_OUTPUT = "/tmp/test-output";

      vi.mocked(githubModule.branchExistsOnRemote).mockResolvedValue(true);
      vi.mocked(githubModule.getPRForBranch).mockResolvedValue(undefined);
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: {
          title: "Fix bug",
          body: "<!-- leonidas-parent: #10 -->\nSome body",
        },
      });
      vi.mocked(postProcessingModule.extractParentIssueNumber).mockReturnValue(10);
      vi.mocked(postProcessingModule.buildRescuePRTitle).mockReturnValue("#10 Fix bug [partial]");
      vi.mocked(postProcessingModule.buildRescuePRBody).mockReturnValue("PR body content");
      vi.mocked(githubModule.createDraftPR).mockResolvedValue(
        "https://github.com/owner/repo/pull/55",
      );
      vi.mocked(postProcessingModule.buildPartialProgressComment).mockReturnValue("draft msg");

      await run();

      expect(postProcessingModule.extractParentIssueNumber).toHaveBeenCalledWith(
        "<!-- leonidas-parent: #10 -->\nSome body",
      );
      expect(postProcessingModule.buildRescuePRTitle).toHaveBeenCalledWith({
        issueNumber: 42,
        issueTitle: "Fix bug",
        parentNumber: 10,
        language: "en",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.createDraftPR).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        "leonidas/issue-42",
        "main",
        "#10 Fix bug [partial]",
        "PR body content",
      );
      expect(fs.appendFileSync).toHaveBeenCalledWith("/tmp/test-output", "pr_created=true\n");
      expect(postProcessingModule.buildPartialProgressComment).toHaveBeenCalledWith({
        issueNumber: 42,
        draftPRUrl: "https://github.com/owner/repo/pull/55",
        language: "en",
        runUrl: "https://example.com/run",
      });
      expect(githubModule.postComment).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "draft msg",
      );
    });

    it("skips GITHUB_OUTPUT writes when GITHUB_OUTPUT is not set", async () => {
      process.argv = ["node", "post_process.js", "rescue"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";
      process.env.BASE_BRANCH = "main";
      process.env.LANGUAGE = "en";
      process.env.RUN_URL = "https://example.com/run";
      delete process.env.GITHUB_OUTPUT;

      vi.mocked(githubModule.branchExistsOnRemote).mockResolvedValue(false);

      await run();

      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });
  });

  describe("run — post-process-pr command", () => {
    it("delegates to postProcessPR with correct arguments", async () => {
      process.argv = ["node", "post_process.js", "post-process-pr"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";

      vi.mocked(githubModule.postProcessPR).mockResolvedValue();

      await run();

      expect(githubModule.postProcessPR).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        42,
        "leonidas/issue-",
      );
    });
  });

  describe("run — trigger-ci command", () => {
    it("delegates to triggerCI with constructed branch name", async () => {
      process.argv = ["node", "post_process.js", "trigger-ci"];
      process.env.GH_TOKEN = "ghp_test";
      process.env.GITHUB_REPOSITORY = "owner/repo";
      process.env.ISSUE_NUMBER = "42";
      process.env.BRANCH_PREFIX = "leonidas/issue-";

      vi.mocked(githubModule.triggerCI).mockResolvedValue();

      await run();

      expect(githubModule.triggerCI).toHaveBeenCalledWith(
        "ghp_test",
        "owner",
        "repo",
        "leonidas/issue-42",
      );
    });
  });

  describe("run — unknown command", () => {
    it("throws error for unknown command", async () => {
      process.argv = ["node", "post_process.js", "unknown-cmd"];

      await expect(run()).rejects.toThrow("Unknown post-process command: unknown-cmd");
    });

    it("throws error when no command provided", async () => {
      process.argv = ["node", "post_process.js"];

      await expect(run()).rejects.toThrow("Unknown post-process command: undefined");
    });
  });
});
