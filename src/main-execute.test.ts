import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import { mockInputs, mockGitHubEvent, mockConfig, setupTestEnvironment, cleanupTestEnvironment, setupCommonMocks } from "./test-helpers/main.helpers";

vi.mock("@actions/core");
vi.mock("fs");
vi.mock("os");
vi.mock("./config");
vi.mock("./prompts/system");
vi.mock("./prompts/plan");
vi.mock("./prompts/execute");
vi.mock("./github");

describe("run() - execute mode edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupTestEnvironment();
    vi.mocked(os.tmpdir).mockReturnValue("/tmp");
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(core.setOutput).mockImplementation(() => {});
    vi.mocked(core.setFailed).mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.restoreAllMocks();
  });

  it("should block execution on decomposed parent issues", async () => {
    mockInputs({ mode: "execute" });
    mockGitHubEvent({
      issue: {
        number: 100,
        title: "Parent Issue",
        body: "Parent body",
        labels: [{ name: "leonidas" }],
        user: { login: "user" },
      },
    });

    const { resolveConfig } = await import("./config");
    vi.mocked(resolveConfig).mockReturnValue(mockConfig());

    const { buildSystemPrompt } = await import("./prompts/system");
    vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

    const { findPlanComment, postComment, isDecomposedPlan } = await import("./github");
    vi.mocked(findPlanComment).mockResolvedValue("# Plan\n\n## Sub-Issues\n- #101");
    vi.mocked(isDecomposedPlan).mockReturnValue(true);
    vi.mocked(postComment).mockResolvedValue();

    await import("./main");

    expect(postComment).toHaveBeenCalledWith(
      "test-github-token",
      "owner",
      "repo",
      100,
      expect.stringContaining("This issue has been decomposed into sub-issues"),
    );
    expect(core.setFailed).toHaveBeenCalledWith(
      "Cannot execute a decomposed parent issue. Execute sub-issues individually.",
    );
  });

  it("should block execution when sub-issue dependency is not closed", async () => {
    mockInputs({ mode: "execute" });
    mockGitHubEvent({
      issue: {
        number: 102,
        title: "[2/3] Sub-issue",
        body: "<!-- leonidas-parent: #100 -->\n<!-- leonidas-depends-on: #101 -->\n<!-- leonidas-order: 2/3 -->\nSub-issue body",
        labels: [{ name: "leonidas" }],
        user: { login: "user" },
      },
    });

    const { resolveConfig } = await import("./config");
    vi.mocked(resolveConfig).mockReturnValue(mockConfig());

    const { buildSystemPrompt } = await import("./prompts/system");
    vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

    const { findPlanComment, postComment, isDecomposedPlan, isIssueClosed, parseSubIssueMetadata } = await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: 101,
      order: 2,
      total: 3,
    });
    vi.mocked(findPlanComment).mockResolvedValue("# Plan\nImplementation plan");
    vi.mocked(isDecomposedPlan).mockReturnValue(false);
    vi.mocked(isIssueClosed).mockResolvedValue(false);
    vi.mocked(postComment).mockResolvedValue();

    await import("./main");

    expect(isIssueClosed).toHaveBeenCalledWith("test-github-token", "owner", "repo", 101);
    expect(postComment).toHaveBeenCalledWith(
      "test-github-token",
      "owner",
      "repo",
      102,
      expect.stringContaining("depends on #101 which is not yet closed"),
    );
    expect(core.setFailed).toHaveBeenCalledWith("Dependency #101 is not yet closed.");
  });

  it("should proceed when sub-issue dependency is closed", async () => {
    mockInputs({ mode: "execute" });
    mockGitHubEvent({
      issue: {
        number: 102,
        title: "[2/3] Sub-issue",
        body: "<!-- leonidas-parent: #100 -->\n<!-- leonidas-depends-on: #101 -->\n<!-- leonidas-order: 2/3 -->\nSub-issue body",
        labels: [{ name: "leonidas" }],
        user: { login: "user" },
      },
    });

    const { resolveConfig, loadRules } = await import("./config");
    vi.mocked(resolveConfig).mockReturnValue(mockConfig());
    vi.mocked(loadRules).mockReturnValue({});

    const { buildSystemPrompt } = await import("./prompts/system");
    vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

    const { buildExecutePrompt } = await import("./prompts/execute");
    vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

    const { findPlanComment, postComment, isDecomposedPlan, isIssueClosed, parseSubIssueMetadata } = await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: 101,
      order: 2,
      total: 3,
    });
    vi.mocked(findPlanComment).mockResolvedValue("# Plan\nImplementation plan");
    vi.mocked(isDecomposedPlan).mockReturnValue(false);
    vi.mocked(isIssueClosed).mockResolvedValue(true);
    vi.mocked(postComment).mockResolvedValue();

    await import("./main");

    expect(isIssueClosed).toHaveBeenCalledWith("test-github-token", "owner", "repo", 101);
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(postComment).toHaveBeenCalledWith(
      "test-github-token",
      "owner",
      "repo",
      102,
      expect.stringContaining("starting implementation"),
    );
  });

  it("should proceed when sub-issue has no dependency", async () => {
    mockInputs({ mode: "execute" });
    mockGitHubEvent({
      issue: {
        number: 101,
        title: "[1/3] First Sub-issue",
        body: "<!-- leonidas-parent: #100 -->\n<!-- leonidas-order: 1/3 -->\nSub-issue body",
        labels: [{ name: "leonidas" }],
        user: { login: "user" },
      },
    });

    const { resolveConfig, loadRules } = await import("./config");
    vi.mocked(resolveConfig).mockReturnValue(mockConfig());
    vi.mocked(loadRules).mockReturnValue({});

    const { buildSystemPrompt } = await import("./prompts/system");
    vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

    const { buildExecutePrompt } = await import("./prompts/execute");
    vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

    const { findPlanComment, postComment, isDecomposedPlan, parseSubIssueMetadata } = await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: undefined,
      order: 1,
      total: 3,
    });
    vi.mocked(findPlanComment).mockResolvedValue("# Plan\nImplementation plan");
    vi.mocked(isDecomposedPlan).mockReturnValue(false);
    vi.mocked(postComment).mockResolvedValue();

    await import("./main");

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(postComment).toHaveBeenCalledWith(
      "test-github-token",
      "owner",
      "repo",
      101,
      expect.stringContaining("starting implementation"),
    );
  });
});
