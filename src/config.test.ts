import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { loadConfigFile, mergeConfig, resolveConfig } from "./config";
import { ActionInputs, LeonidasConfig } from "./types";

vi.mock("fs");
vi.mock("js-yaml");

describe("config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadConfigFile", () => {
    it("should load and parse valid YAML config file", () => {
      const mockConfig = { model: "claude-opus-4", max_turns: 100 };
      vi.mocked(fs.readFileSync).mockReturnValue("model: claude-opus-4\nmax_turns: 100");
      vi.mocked(yaml.load).mockReturnValue(mockConfig);

      const result = loadConfigFile(".leonidas.yml");

      expect(fs.readFileSync).toHaveBeenCalledWith(".leonidas.yml", "utf-8");
      expect(yaml.load).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it("should return empty object when file does not exist", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const result = loadConfigFile("nonexistent.yml");

      expect(result).toEqual({});
    });

    it("should return empty object when YAML is invalid", () => {
      vi.mocked(fs.readFileSync).mockReturnValue("invalid: yaml: content:");
      vi.mocked(yaml.load).mockImplementation(() => {
        throw new Error("YAML parse error");
      });

      const result = loadConfigFile(".leonidas.yml");

      expect(result).toEqual({});
    });

    it("should return empty object when yaml.load returns null", () => {
      vi.mocked(fs.readFileSync).mockReturnValue("");
      vi.mocked(yaml.load).mockReturnValue(null);

      const result = loadConfigFile(".leonidas.yml");

      expect(result).toEqual({});
    });
  });

  describe("mergeConfig", () => {
    const defaultConfig: LeonidasConfig = {
      label: "leonidas",
      model: "claude-sonnet-4-5-20250929",
      branch_prefix: "claude/issue-",
      base_branch: "main",
      allowed_tools: [
        "Read",
        "Write",
        "Edit",
        "Bash(npm:*)",
        "Bash(git:*)",
        "Bash(gh:*)",
        "Bash(npx:*)",
        "Bash(node:*)",
        "Bash(mkdir:*)",
        "Bash(ls:*)",
        "Bash(cat:*)",
      ],
      max_turns: 50,
      language: "en",
    };

    it("should merge file config with default config", () => {
      const fileConfig = { model: "claude-opus-4", max_turns: 100 };
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result).toEqual({
        ...defaultConfig,
        model: "claude-opus-4",
        max_turns: 100,
      });
    });

    it("should prioritize input model over file config", () => {
      const fileConfig = { model: "claude-opus-4" };
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        model: "claude-haiku-4",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.model).toBe("claude-haiku-4");
    });

    it("should prioritize input max_turns over file config", () => {
      const fileConfig = { max_turns: 100 };
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        max_turns: 75,
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.max_turns).toBe(75);
    });

    it("should parse and set allowed_tools from comma-separated string", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        allowed_tools: "Read, Write, Edit",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.allowed_tools).toEqual(["Read", "Write", "Edit"]);
    });

    it("should trim whitespace from allowed_tools", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        allowed_tools: "  Read  ,  Write  ,  Edit  ",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.allowed_tools).toEqual(["Read", "Write", "Edit"]);
    });

    it("should set branch_prefix from inputs", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        branch_prefix: "bot/issue-",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.branch_prefix).toBe("bot/issue-");
    });

    it("should set base_branch from inputs", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        base_branch: "develop",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.base_branch).toBe("develop");
    });

    it("should set language from inputs", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        language: "ja",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.language).toBe("ja");
    });

    it("should return default config when no file config or inputs provided", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result).toEqual(defaultConfig);
    });

    it("should handle max_turns of 0", () => {
      const fileConfig = {};
      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        max_turns: 0,
      };

      const result = mergeConfig(fileConfig, inputs);

      expect(result.max_turns).toBe(0);
    });

    describe("label validation", () => {
      it("should accept valid label with alphanumeric characters", () => {
        const fileConfig = { label: "leonidas" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("leonidas");
      });

      it("should accept valid label with hyphens", () => {
        const fileConfig = { label: "my-label" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("my-label");
      });

      it("should accept valid label with underscores", () => {
        const fileConfig = { label: "test_label" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("test_label");
      });

      it("should accept valid label with mixed alphanumeric, hyphens, and underscores", () => {
        const fileConfig = { label: "my_label-v2_test" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("my_label-v2_test");
      });

      it("should accept valid label with numbers", () => {
        const fileConfig = { label: "v2024" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("v2024");
      });

      it("should accept single character label", () => {
        const fileConfig = { label: "a" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.label).toBe("a");
      });

      it("should reject label with spaces", () => {
        const fileConfig = { label: "has spaces" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with semicolons", () => {
        const fileConfig = { label: "has;semicolons" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with angle brackets", () => {
        const fileConfig = { label: "has<brackets>" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with ampersands", () => {
        const fileConfig = { label: "has&amp" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with dots", () => {
        const fileConfig = { label: "v2.0" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with slashes", () => {
        const fileConfig = { label: "has/slash" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject label with special characters", () => {
        const fileConfig = { label: "has@special#chars!" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });

      it("should reject empty label", () => {
        const fileConfig = { label: "" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow();
      });
    });
  });

  describe("resolveConfig", () => {
    it("should load config file and merge with inputs", () => {
      const mockConfig = { model: "claude-opus-4", max_turns: 100 };
      vi.mocked(fs.readFileSync).mockReturnValue("model: claude-opus-4\nmax_turns: 100");
      vi.mocked(yaml.load).mockReturnValue(mockConfig);

      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
        model: "claude-haiku-4",
      };

      const result = resolveConfig(inputs);

      expect(fs.readFileSync).toHaveBeenCalledWith(".leonidas.yml", "utf-8");
      expect(result.model).toBe("claude-haiku-4");
      expect(result.max_turns).toBe(100);
    });

    it("should handle missing config file", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const inputs: ActionInputs = {
        mode: "plan",
        anthropic_api_key: "test-key",
        github_token: "test-token",
        config_path: ".leonidas.yml",
        system_prompt_path: ".github/leonidas.md",
      };

      const result = resolveConfig(inputs);

      expect(result.model).toBe("claude-sonnet-4-5-20250929");
      expect(result.max_turns).toBe(50);
    });
  });
});
