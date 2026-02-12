import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import { run } from "./main";
import {
  mockInputs,
  mockGitHubEvent,
  mockConfig,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from "./test-helpers/main.helpers";

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

    const { createGitHubClient, isDecomposedPlan } = await import("./github");
    const mockClient = {
      findPlanComment: vi.fn().mockResolvedValue("# Plan\n\n## Sub-Issues\n- #101"),
      postComment: vi.fn().mockResolvedValue(undefined),
      isIssueClosed: vi.fn(),
      linkSubIssues: vi.fn(),
      getPRForBranch: vi.fn(),
      branchExistsOnRemote: vi.fn(),
      createDraftPR: vi.fn(),
      postProcessPR: vi.fn(),
      triggerCI: vi.fn(),
      getIssue: vi.fn(),
    };
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as any);
    vi.mocked(isDecomposedPlan).mockReturnValue(true);

    await run();

    expect(mockClient.postComment).toHaveBeenCalledWith(
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

    const { createGitHubClient, isDecomposedPlan, parseSubIssueMetadata } =
      await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: 101,
      order: 2,
      total: 3,
    });
    const mockClient = {
      findPlanComment: vi.fn().mockResolvedValue("# Plan\nImplementation plan"),
      postComment: vi.fn().mockResolvedValue(undefined),
      isIssueClosed: vi.fn().mockResolvedValue(false),
      linkSubIssues: vi.fn(),
      getPRForBranch: vi.fn(),
      branchExistsOnRemote: vi.fn(),
      createDraftPR: vi.fn(),
      postProcessPR: vi.fn(),
      triggerCI: vi.fn(),
      getIssue: vi.fn(),
    };
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as any);
    vi.mocked(isDecomposedPlan).mockReturnValue(false);

    await run();

    expect(mockClient.isIssueClosed).toHaveBeenCalledWith(101);
    expect(mockClient.postComment).toHaveBeenCalledWith(
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

    const { createGitHubClient, isDecomposedPlan, parseSubIssueMetadata } =
      await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: 101,
      order: 2,
      total: 3,
    });
    const mockClient = {
      findPlanComment: vi.fn().mockResolvedValue("# Plan\nImplementation plan"),
      postComment: vi.fn().mockResolvedValue(undefined),
      isIssueClosed: vi.fn().mockResolvedValue(true),
      linkSubIssues: vi.fn(),
      getPRForBranch: vi.fn(),
      branchExistsOnRemote: vi.fn(),
      createDraftPR: vi.fn(),
      postProcessPR: vi.fn(),
      triggerCI: vi.fn(),
      getIssue: vi.fn(),
    };
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as any);
    vi.mocked(isDecomposedPlan).mockReturnValue(false);

    await run();

    expect(mockClient.isIssueClosed).toHaveBeenCalledWith(101);
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(mockClient.postComment).toHaveBeenCalledWith(
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

    const { createGitHubClient, isDecomposedPlan, parseSubIssueMetadata } =
      await import("./github");
    vi.mocked(parseSubIssueMetadata).mockReturnValue({
      parent_issue_number: 100,
      depends_on: undefined,
      order: 1,
      total: 3,
    });
    const mockClient = {
      findPlanComment: vi.fn().mockResolvedValue("# Plan\nImplementation plan"),
      postComment: vi.fn().mockResolvedValue(undefined),
      isIssueClosed: vi.fn(),
      linkSubIssues: vi.fn(),
      getPRForBranch: vi.fn(),
      branchExistsOnRemote: vi.fn(),
      createDraftPR: vi.fn(),
      postProcessPR: vi.fn(),
      triggerCI: vi.fn(),
      getIssue: vi.fn(),
    };
    vi.mocked(createGitHubClient).mockReturnValue(mockClient as any);
    vi.mocked(isDecomposedPlan).mockReturnValue(false);

    await run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(mockClient.postComment).toHaveBeenCalledWith(
      101,
      expect.stringContaining("starting implementation"),
    );
  });
});
