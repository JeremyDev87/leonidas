import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import { readInputs, readGitHubContext } from "./main";
import { mockInputs, mockGitHubEvent, setupTestEnvironment, cleanupTestEnvironment } from "./test-helpers/main.helpers";

vi.mock("@actions/core");
vi.mock("fs");

describe("readInputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error for invalid mode", () => {
    mockInputs({ mode: "invalid" });

    expect(() => readInputs()).toThrow('Invalid mode: invalid. Must be "plan" or "execute".');
  });

  it("should throw error for non-numeric max_turns", () => {
    mockInputs({ max_turns: "abc" });

    expect(() => readInputs()).toThrow('Invalid max_turns value: "abc"');
  });

  it("should parse valid numeric max_turns", () => {
    mockInputs({ max_turns: "100" });

    const result = readInputs();

    expect(result.max_turns).toBe(100);
  });

  it("should set max_turns to undefined when empty string", () => {
    mockInputs({ max_turns: "" });

    const result = readInputs();

    expect(result.max_turns).toBeUndefined();
  });

  it("should read all required inputs for plan mode", () => {
    mockInputs({
      mode: "plan",
      anthropic_api_key: "test-api-key",
      github_token: "test-github-token",
    });

    const result = readInputs();

    expect(result.mode).toBe("plan");
    expect(result.anthropic_api_key).toBe("test-api-key");
    expect(result.github_token).toBe("test-github-token");
  });

  it("should read all required inputs for execute mode", () => {
    mockInputs({
      mode: "execute",
      anthropic_api_key: "exec-api-key",
      github_token: "exec-github-token",
    });

    const result = readInputs();

    expect(result.mode).toBe("execute");
    expect(result.anthropic_api_key).toBe("exec-api-key");
    expect(result.github_token).toBe("exec-github-token");
  });

  it("should read optional inputs", () => {
    mockInputs({
      model: "claude-opus-4",
      branch_prefix: "bot/issue-",
      base_branch: "develop",
      language: "ja",
      config_path: "custom.yml",
      system_prompt_path: "custom.md",
      rules_path: "custom-rules",
      allowed_tools: "Read,Write",
    });

    const result = readInputs();

    expect(result.model).toBe("claude-opus-4");
    expect(result.branch_prefix).toBe("bot/issue-");
    expect(result.base_branch).toBe("develop");
    expect(result.language).toBe("ja");
    expect(result.config_path).toBe("custom.yml");
    expect(result.system_prompt_path).toBe("custom.md");
    expect(result.rules_path).toBe("custom-rules");
    expect(result.allowed_tools).toBe("Read,Write");
  });

  it("should handle undefined optional fields", () => {
    mockInputs({
      model: "",
      branch_prefix: "",
      base_branch: "",
      language: "",
      allowed_tools: "",
      rules_path: "",
    });

    const result = readInputs();

    expect(result.model).toBeUndefined();
    expect(result.branch_prefix).toBeUndefined();
    expect(result.base_branch).toBeUndefined();
    expect(result.language).toBeUndefined();
    expect(result.allowed_tools).toBeUndefined();
    expect(result.rules_path).toBeUndefined();
  });

  it("should use default values for config_path and system_prompt_path", () => {
    mockInputs({
      config_path: "",
      system_prompt_path: "",
    });

    const result = readInputs();

    expect(result.config_path).toBe("leonidas.config.yml");
    expect(result.system_prompt_path).toBe(".github/leonidas.md");
  });
});

describe("readGitHubContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it("should throw error when GITHUB_EVENT_PATH not set", () => {
    delete process.env.GITHUB_EVENT_PATH;

    expect(() => readGitHubContext()).toThrow("GITHUB_EVENT_PATH not set");
  });

  it("should throw error when GITHUB_REPOSITORY not set", () => {
    delete process.env.GITHUB_REPOSITORY;
    mockGitHubEvent();

    expect(() => readGitHubContext()).toThrow("GITHUB_REPOSITORY is not set or malformed (expected 'owner/repo')");
  });

  it("should throw error when GITHUB_REPOSITORY is malformed", () => {
    process.env.GITHUB_REPOSITORY = "invalid";
    mockGitHubEvent();

    expect(() => readGitHubContext()).toThrow("GITHUB_REPOSITORY is not set or malformed (expected 'owner/repo')");
  });

  it("should throw error when no issue in event payload", () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

    expect(() => readGitHubContext()).toThrow("No issue found in GitHub event payload");
  });

  it("should read valid GitHub context", () => {
    mockGitHubEvent({
      issue: {
        number: 42,
        title: "Bug report",
        body: "This is a bug",
        labels: [{ name: "bug" }, { name: "high-priority" }],
        user: { login: "developer" },
      },
      comment: {
        author_association: "MEMBER",
      },
    });

    const result = readGitHubContext();

    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
    expect(result.issue_number).toBe(42);
    expect(result.issue_title).toBe("Bug report");
    expect(result.issue_body).toBe("This is a bug");
    expect(result.issue_labels).toEqual(["bug", "high-priority"]);
    expect(result.issue_author).toBe("developer");
    expect(result.comment_author_association).toBe("MEMBER");
  });

  it("should handle missing issue body", () => {
    mockGitHubEvent({
      issue: {
        number: 1,
        title: "Test",
        body: undefined as any,
        labels: [],
        user: { login: "user" },
      },
    });

    const result = readGitHubContext();

    expect(result.issue_body).toBe("");
  });

  it("should handle missing issue labels", () => {
    mockGitHubEvent({
      issue: {
        number: 1,
        title: "Test",
        body: "Body",
        labels: undefined as any,
        user: { login: "user" },
      },
    });

    const result = readGitHubContext();

    expect(result.issue_labels).toEqual([]);
  });

  it("should handle missing issue author", () => {
    mockGitHubEvent({
      issue: {
        number: 1,
        title: "Test",
        body: "Body",
        labels: [],
        user: undefined as any,
      },
    });

    const result = readGitHubContext();

    expect(result.issue_author).toBe("");
  });

  it("should handle missing comment author association", () => {
    mockGitHubEvent({
      issue: {
        number: 1,
        title: "Test",
        body: "Body",
        labels: [],
        user: { login: "user" },
      },
      comment: undefined as any,
    });

    const result = readGitHubContext();

    expect(result.comment_author_association).toBe("");
  });

  it("should handle empty labels array", () => {
    mockGitHubEvent({
      issue: {
        number: 1,
        title: "Test",
        body: "Body",
        labels: [],
        user: { login: "user" },
      },
    });

    const result = readGitHubContext();

    expect(result.issue_labels).toEqual([]);
  });
});
