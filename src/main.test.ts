import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";

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
    vi.resetModules();

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
  });

  describe("readInputs (via run)", () => {
    it("should read inputs for valid plan mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          model: "claude-opus-4",
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
        branch_prefix: "claude/issue-",
        base_branch: "main",
        allowed_tools: ["Read", "Write"],
        max_turns: 50,
        language: "en",
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await import("./main");

      expect(core.getInput).toHaveBeenCalledWith("mode", { required: true });
      expect(core.getInput).toHaveBeenCalledWith("anthropic_api_key", { required: true });
      expect(core.getInput).toHaveBeenCalledWith("github_token", { required: true });
      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-opus-4");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "10");
      expect(core.setOutput).toHaveBeenCalledWith(
        "allowed_tools",
        "Read,Bash(gh issue comment:*),Bash(find:*),Bash(ls:*),Bash(cat:*)",
      );
    });

    it("should read inputs for valid execute mode", async () => {
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
            labels: [{ name: "bug" }],
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
        allowed_tools: ["Read", "Write", "Edit"],
        max_turns: 50,
        language: "en",
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { findPlanComment, postComment } = await import("./github");
      vi.mocked(findPlanComment).mockResolvedValue("# Plan\nImplementation plan here");
      vi.mocked(postComment).mockResolvedValue();

      await import("./main");

      expect(core.getInput).toHaveBeenCalledWith("mode", { required: true });
      expect(findPlanComment).toHaveBeenCalledWith("test-github-token", "owner", "repo", 1);
      expect(postComment).toHaveBeenCalledWith(
        "test-github-token",
        "owner",
        "repo",
        1,
        "⚡ **Leonidas** is starting implementation for issue #1...",
      );
      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-sonnet-4-5-20250929");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "50");
      expect(core.setOutput).toHaveBeenCalledWith("allowed_tools", "Read,Write,Edit");
    });

    it("should throw error for invalid mode", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "invalid",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
        };
        return inputs[name] || "";
      });

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith(
        'Invalid mode: invalid. Must be "plan" or "execute".',
      );
    });

    it("should parse max_turns from string input", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
          max_turns: "75",
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await import("./main");

      expect(core.getInput).toHaveBeenCalledWith("max_turns");
    });

    it("should handle undefined optional fields", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string, options?: any) => {
        if (options?.required) {
          const required: Record<string, string> = {
            mode: "plan",
            anthropic_api_key: "test-api-key",
            github_token: "test-github-token",
          };
          return required[name] || "";
        }
        const defaults: Record<string, string> = {
          config_path: "leonidas.config.yml",
          system_prompt_path: ".github/leonidas.md",
        };
        return defaults[name] || "";
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await import("./main");

      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-sonnet-4-5-20250929");
    });
  });

  describe("readGitHubContext (via run)", () => {
    it("should read valid GitHub context from event payload", async () => {
      process.env.GITHUB_EVENT_PATH = "/tmp/event.json";
      process.env.GITHUB_REPOSITORY = "owner/repo";

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
            number: 42,
            title: "Fix bug",
            body: "Bug description",
            labels: [{ name: "bug" }, { name: "priority" }],
            user: { login: "contributor" },
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await import("./main");

      expect(buildPlanPrompt).toHaveBeenCalledWith(
        "Fix bug",
        "Bug description",
        42,
        "owner/repo",
        "system prompt",
      );
    });

    it("should throw error when GITHUB_EVENT_PATH not set", async () => {
      delete process.env.GITHUB_EVENT_PATH;

      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
        };
        return inputs[name] || "";
      });

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith("GITHUB_EVENT_PATH not set");
    });

    it("should throw error when issue not found in payload", async () => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          mode: "plan",
          anthropic_api_key: "test-api-key",
          github_token: "test-github-token",
        };
        return inputs[name] || "";
      });

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith("No issue found in GitHub event payload");
    });

    it("should handle missing issue body and labels", async () => {
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
            user: {},
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt");

      await import("./main");

      expect(buildPlanPrompt).toHaveBeenCalledWith("Test Issue", "", 1, "owner/repo", "system prompt");
    });
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildPlanPrompt } = await import("./prompts/plan");
      vi.mocked(buildPlanPrompt).mockReturnValue("plan prompt content");

      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await import("./main");

      expect(buildPlanPrompt).toHaveBeenCalledWith(
        "Test Issue",
        "Test body",
        1,
        "owner/repo",
        "system prompt",
      );

      expect(core.setOutput).toHaveBeenCalledWith("prompt_file", expect.stringContaining("leonidas-prompt-"));
      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-opus-4");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "10");
      expect(core.setOutput).toHaveBeenCalledWith(
        "allowed_tools",
        "Read,Bash(gh issue comment:*),Bash(find:*),Bash(ls:*),Bash(cat:*)",
      );
      expect(core.setOutput).toHaveBeenCalledWith("branch_prefix", "bot/issue-");
      expect(core.setOutput).toHaveBeenCalledWith("base_branch", "develop");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("leonidas-prompt-"),
        "plan prompt content",
        "utf-8",
      );
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt content");

      const { findPlanComment, postComment } = await import("./github");
      vi.mocked(findPlanComment).mockResolvedValue("# Plan Comment\nDetailed plan");
      vi.mocked(postComment).mockResolvedValue();

      await import("./main");

      expect(findPlanComment).toHaveBeenCalledWith("test-github-token", "owner", "repo", 5);
      expect(postComment).toHaveBeenCalledWith(
        "test-github-token",
        "owner",
        "repo",
        5,
        "⚡ **Leonidas** is starting implementation for issue #5...",
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

      const { resolveConfig } = await import("./config");
      vi.mocked(resolveConfig).mockReturnValue({
        label: "leonidas",
        model: "claude-opus-4",
        branch_prefix: "feature/issue-",
        base_branch: "staging",
        allowed_tools: ["Read", "Write", "Edit", "Bash(npm:*)", "Bash(git:*)"],
        max_turns: 75,
        language: "ja",
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { buildExecutePrompt } = await import("./prompts/execute");
      vi.mocked(buildExecutePrompt).mockReturnValue("execute prompt");

      const { findPlanComment, postComment } = await import("./github");
      vi.mocked(findPlanComment).mockResolvedValue("Plan content");
      vi.mocked(postComment).mockResolvedValue();

      await import("./main");

      expect(buildExecutePrompt).toHaveBeenCalledWith(
        "Execute Issue",
        "Execute body",
        "Plan content",
        10,
        "feature/issue-",
        "staging",
        "system prompt",
        75,
        ["bug", "urgent"],
        "reporter",
      );

      expect(core.setOutput).toHaveBeenCalledWith("model", "claude-opus-4");
      expect(core.setOutput).toHaveBeenCalledWith("max_turns", "75");
      expect(core.setOutput).toHaveBeenCalledWith("allowed_tools", "Read,Write,Edit,Bash(npm:*),Bash(git:*)");
      expect(core.setOutput).toHaveBeenCalledWith("branch_prefix", "feature/issue-");
      expect(core.setOutput).toHaveBeenCalledWith("base_branch", "staging");
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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { findPlanComment } = await import("./github");
      vi.mocked(findPlanComment).mockResolvedValue(null);

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith(
        "No plan comment found on issue #99. Run plan mode first.",
      );
    });
  });

  describe("run() - error handling", () => {
    it("should catch and report errors via setFailed", async () => {
      vi.mocked(core.getInput).mockImplementation(() => {
        throw new Error("Input error");
      });

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith("Input error");
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(core.getInput).mockImplementation(() => {
        throw "string error";
      });

      await import("./main");

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
      });

      const { buildSystemPrompt } = await import("./prompts/system");
      vi.mocked(buildSystemPrompt).mockReturnValue("system prompt");

      const { findPlanComment } = await import("./github");
      vi.mocked(findPlanComment).mockRejectedValue(new Error("GitHub API error"));

      await import("./main");

      expect(core.setFailed).toHaveBeenCalledWith("GitHub API error");
    });
  });
});
