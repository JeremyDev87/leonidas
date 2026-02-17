import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import { run, readInputs } from "./main";

vi.mock("@actions/core");
vi.mock("fs");
vi.mock("os");
vi.mock("./config");
vi.mock("./prompts/system");
vi.mock("./prompts/plan");
vi.mock("./prompts/execute");
vi.mock("./github");

describe("main", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default environment
    process.env.GITHUB_EVENT_PATH = "/tmp/event.json";
    process.env.GITHUB_REPOSITORY = "owner/repo";

    // Default mocks
    vi.mocked(os.tmpdir).mockReturnValue("/tmp");
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(core.setOutput).mockImplementation(() => {});
    vi.mocked(core.setFailed).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.RUNNER_TEMP;
  });

  describe("run() - plan mode", () => {
    it("should set correct outputs for plan mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-opus-4",
        branch_prefix: "bot/issue-",
        base_branch: "develop",
        allowed_tools: ["Read", "Write"],
        max_turns: 100,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt content");

      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await run();

      expect(buildPlanPrompt).toHaveBeenCalledWith(
        "Test Issue",
        "Test body",
        1,
        "owner/repo",
        "system prompt",
        "leonidas",
        "en",
      );

      expect(core.setOutput).toHaveBeenCalledWith(
        "prompt_file",
        expect.stringContaining("leonidas-prompt-"),
      );
      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-opus-4");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "20");
      expect(core.setOutput).toHaveBeenCalledWith(
        "allowed_tools",
        "Read,Bash(gh issue comment:*),Bash(gh issue create:*),Bash(gh api:*),Bash(find:*),Bash(ls:*),Bash(cat:*)",
      );
      expect(core.setOutput).toHaveBeenCalledWith("branch_prefix", "bot/issue-");
      expect(core.setOutput).toHaveBeenCalledWith("base_branch", "develop");
      expect(core.setOutput).toHaveBeenCalledWith("language", "en");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("leonidas-prompt-"),
        "plan prompt content",
        { encoding: "utf-8", mode: 0o600 },
      );
    });

    it("should use RUNNER_TEMP when available", async () => {
      process.env.RUNNER_TEMP = "/runner/tmp";

      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-opus-4",
        branch_prefix: "bot/issue-",
        base_branch: "develop",
        allowed_tools: ["Read"],
        max_turns: 100,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("prompt content");

      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await run();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/^\/runner\/tmp\/leonidas-prompt-[0-9a-f-]+\.md$/),
        "prompt content",
        { encoding: "utf-8", mode: 0o600 },
      );

      delete process.env.RUNNER_TEMP;
    });
  });

  describe("run() - execute mode", () => {
    it("should call findPlanComment and postComment", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 5,
            title: "Execute Issue",
            body: "Execute body",
            labels: [{ name: "feature" }],
            user: { login: "dev" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read", "Write", "Edit", "Bash(git:*)"],
        max_turns: 60,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt content");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("# Plan Comment\nDetailed plan"),
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

      await run();

      expect(mockClient.findPlanComment).toHaveBeenCalledWith(5);
      expect(mockClient.postComment).toHaveBeenCalledWith(
        5,
        expect.stringContaining("starting implementation"),
      );
    });

    it("should set correct outputs with config values", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 10,
            title: "Execute Issue",
            body: "Execute body",
            labels: [{ name: "bug" }, { name: "urgent" }],
            user: { login: "reporter" },
          },
        }),
      );

      const { resolveConfig, loadRules } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-opus-4",
        branch_prefix: "feature/issue-",
        base_branch: "staging",
        allowed_tools: ["Read", "Write", "Edit", "Bash(npm:*)", "Bash(git:*)"],
        max_turns: 75,
        language: "ja",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });
      vi.mocked(loadRules).mockReturnValue({});

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("Plan content"),
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

      await run();

      expect(buildExecutePrompt).toHaveBeenCalledWith({
        issueTitle: "Execute Issue",
        issueBody: "Execute body",
        planComment: "Plan content",
        issueNumber: 10,
        branchPrefix: "feature/issue-",
        baseBranch: "staging",
        systemPrompt: "system prompt",
        maxTurns: 75,
        issueLabels: ["bug", "urgent"],
        issueAuthor: "reporter",
        subIssueMetadata: undefined,
        hasRules: false,
      });

      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-opus-4");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "75");
      expect(core.setOutput).toHaveBeenCalledWith(
        "allowed_tools",
        "Read,Write,Edit,Bash(npm:*),Bash(git:*)",
      );
      expect(core.setOutput).toHaveBeenCalledWith("branch_prefix", "feature/issue-");
      expect(core.setOutput).toHaveBeenCalledWith("base_branch", "staging");
      expect(core.setOutput).toHaveBeenCalledWith("language", "ja");
    });

    it("should call setFailed when plan comment not found", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 99,
            title: "Execute Issue",
            body: "Execute body",
            labels: [],
            user: { login: "user" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue(null),
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

      await run();

      expect(core.setFailed).toHaveBeenCalledWith(
        "No plan comment found on issue #99. Run plan mode first.",
      );
    });
  });

  describe("readInputs() - secrets handling", () => {
    it("should register API key and GitHub token as secrets", () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
        };
        return inputs[name] || "";
      });
      vi.mocked(core.setSecret).mockImplementation(() => {});

      readInputs();

      expect(core.setSecret).toHaveBeenCalledWith("test-api-key");
      expect(core.setSecret).toHaveBeenCalledWith("test-github-token");
      expect(core.setSecret).toHaveBeenCalledTimes(2);
    });
  });

  describe("run() - error handling", () => {
    it("should catch and report errors via setFailed", async () => {
      vi.mocked(core.getInput).mockImplementation(() => {
        throw new Error("Input error");
      });

      await run();

      expect(core.setFailed).toHaveBeenCalledWith("Input error");
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(core.getInput).mockImplementation(() => {
        throw "string error";
      });

      await run();

      expect(core.setFailed).toHaveBeenCalledWith("An unexpected error occurred");
    });

    it("should handle async errors in execute mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test",
            body: "Body",
            labels: [],
            user: { login: "user" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockRejectedValue(new Error("GitHub API error")),
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

      await run();

      expect(core.setFailed).toHaveBeenCalledWith("GitHub API error");
    });
  });

  describe("language parameter wiring", () => {
    it("should pass language parameter to buildSystemPrompt in plan mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "ko",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await run();

      expect(buildSystemPrompt).toHaveBeenCalledWith(".github/leonidas.md", "ko", undefined);
      expect(buildPlanPrompt).toHaveBeenCalledWith(
        "Test Issue",
        "Test body",
        1,
        "owner/repo",
        "system prompt",
        "leonidas",
        "ko",
      );
      expect(core.setOutput).toHaveBeenCalledWith("language", "ko");
    });

    it("should pass language parameter to buildSystemPrompt in execute mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig, loadRules } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "es",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });
      vi.mocked(loadRules).mockReturnValue({});

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("Plan content"),
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

      await run();

      expect(buildSystemPrompt).toHaveBeenCalledWith(".github/leonidas.md", "es", {});
      expect(buildExecutePrompt).toHaveBeenCalledWith({
        issueTitle: "Test Issue",
        issueBody: "Test body",
        planComment: "Plan content",
        issueNumber: 1,
        branchPrefix: "claude/issue-",
        baseBranch: "main",
        systemPrompt: "system prompt",
        maxTurns: 50,
        issueLabels: [],
        issueAuthor: "testuser",
        subIssueMetadata: undefined,
        hasRules: false,
      });
      expect(core.setOutput).toHaveBeenCalledWith("language", "es");
    });

    it("should default to English when language not specified", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await run();

      expect(buildSystemPrompt).toHaveBeenCalledWith(".github/leonidas.md", "en", undefined);
      expect(buildPlanPrompt).toHaveBeenCalledWith(
        "Test Issue",
        "Test body",
        1,
        "owner/repo",
        "system prompt",
        "leonidas",
        "en",
      );
      expect(core.setOutput).toHaveBeenCalledWith("language", "en");
    });

    it("should pass language to buildSubIssuePlanPrompt for sub-issues", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "[1/3] Test Sub-Issue",
            body: "<!-- leonidas-parent: #100 -->\n<!-- leonidas-order: 1/3 -->\nTest sub-issue body",
            labels: [],
            user: { login: "testuser" },
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "zh",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildSubIssuePlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildSubIssuePlanPrompt).mockReturnValue("sub-issue plan prompt");

      const { parseSubIssueMetadata } = await import("./github");
      vi.mocked(parseSubIssueMetadata).mockReturnValue({
        parent_issue_number: 100,
        order: 1,
        total: 3,
      });

      await run();

      expect(buildSystemPrompt).toHaveBeenCalledWith(".github/leonidas.md", "zh", undefined);
      expect(buildSubIssuePlanPrompt).toHaveBeenCalledWith(
        "[1/3] Test Sub-Issue",
        "<!-- leonidas-parent: #100 -->\n<!-- leonidas-order: 1/3 -->\nTest sub-issue body",
        1,
        "owner/repo",
        "system prompt",
        {
          parent_issue_number: 100,
          order: 1,
          total: 3,
        },
        "zh",
      );
      expect(core.setOutput).toHaveBeenCalledWith("language", "zh");
    });
  });

  describe("run() - execute mode authorization", () => {
    it("should reject unauthorized user when authorized_approvers is configured", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [{ name: "leonidas" }],
            user: { login: "attacker" },
          },
          comment: {
            author_association: "NONE",
          },
        }),
      );

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: ["OWNER", "MEMBER", "COLLABORATOR"],
      });

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn(),
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

      await run();

      expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining("Unauthorized"));
      expect(mockClient.postComment).toHaveBeenCalledWith(
        1,
        expect.stringContaining("Unauthorized approver"),
      );
    });

    it("should allow authorized user (OWNER) when authorized_approvers is configured", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [{ name: "leonidas" }],
            user: { login: "owner-user" },
          },
          comment: {
            author_association: "OWNER",
          },
        }),
      );

      const { resolveConfig, loadRules } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: ["OWNER", "MEMBER", "COLLABORATOR"],
      });
      vi.mocked(loadRules).mockReturnValue({});

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("# Plan"),
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

      await run();

      // Should NOT have been rejected
      expect(core.setFailed).not.toHaveBeenCalled();
      // Should have proceeded to post the "starting implementation" comment
      expect(mockClient.postComment).toHaveBeenCalledWith(
        1,
        expect.stringContaining("starting implementation"),
      );
    });

    it("should skip authorization check when authorized_approvers is empty", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [{ name: "leonidas" }],
            user: { login: "anyone" },
          },
          comment: {
            author_association: "NONE",
          },
        }),
      );

      const { resolveConfig, loadRules } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: [],
      });
      vi.mocked(loadRules).mockReturnValue({});

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("# Plan"),
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

      await run();

      // Should NOT have been rejected despite NONE association
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should allow custom authorized_approvers including CONTRIBUTOR", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "execute",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          issue: {
            number: 1,
            title: "Test Issue",
            body: "Test body",
            labels: [{ name: "leonidas" }],
            user: { login: "contributor-user" },
          },
          comment: {
            author_association: "CONTRIBUTOR",
          },
        }),
      );

      const { resolveConfig, loadRules } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-sonnet-4-5-20250929",
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read"],
        max_turns: 50,
        language: "en",
        rules_path: ".github/leonidas-rules",
        authorized_approvers: ["OWNER", "MEMBER", "COLLABORATOR", "CONTRIBUTOR"],
      });
      vi.mocked(loadRules).mockReturnValue({});

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { createGitHubClient } = await import("./github");
      const mockClient = {
        findPlanComment: vi.fn().mockResolvedValue("# Plan"),
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

      await run();

      // CONTRIBUTOR should be allowed with custom config
      expect(core.setFailed).not.toHaveBeenCalled();
      expect(mockClient.postComment).toHaveBeenCalledWith(
        1,
        expect.stringContaining("starting implementation"),
      );
    });
  });
});
