import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { loadConfigFile, mergeConfig, resolveConfig, loadRules } from "./config";
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
      expect(yaml.load).toHaveBeenCalledWith(
        "model: claude-opus-4\nmax_turns: 100",
        { schema: yaml.JSON_SCHEMA }
      );
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
      rules_path: ".github/leonidas-rules",
      authorized_approvers: ["OWNER", "MEMBER", "COLLABORATOR"],
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
        rules_path: ".github/leonidas-rules",
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

    describe("max_turns validation", () => {
      it("should reject max_turns of 0 (below minimum)", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 0,
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got 0",
        );
      });

      it("should reject negative max_turns", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: -10,
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got -10",
        );
      });

      it("should reject max_turns below minimum boundary", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 9,
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got 9",
        );
      });

      it("should reject max_turns above maximum boundary", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 201,
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got 201",
        );
      });

      it("should reject excessively large max_turns", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 999999,
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got 999999",
        );
      });

      it("should accept max_turns at minimum boundary (10)", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 10,
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.max_turns).toBe(10);
      });

      it("should accept max_turns at maximum boundary (200)", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 200,
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.max_turns).toBe(200);
      });

      it("should accept valid max_turns in normal range", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
          max_turns: 50,
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.max_turns).toBe(50);
      });

      it("should validate max_turns from file config", () => {
        const fileConfig = { max_turns: 5 };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "max_turns must be between 10 and 200, got 5",
        );
      });
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

      it("should provide informative error message for invalid label", () => {
        const fileConfig = { label: "invalid label!" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          'Invalid label format: "invalid label!". Labels must contain only alphanumeric characters, hyphens, and underscores.',
        );
      });

      it("should include the invalid label value in error message", () => {
        const fileConfig = { label: "test@label" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow('Invalid label format: "test@label"');
      });

      it("should explain allowed characters in error message", () => {
        const fileConfig = { label: "bad.label" };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "Labels must contain only alphanumeric characters, hyphens, and underscores",
        );
      });
    });

    describe("authorized_approvers validation", () => {
      it("should accept valid authorized_approvers", () => {
        const fileConfig = { authorized_approvers: ["OWNER", "MEMBER", "COLLABORATOR"] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.authorized_approvers).toEqual(["OWNER", "MEMBER", "COLLABORATOR"]);
      });

      it("should accept CONTRIBUTOR as authorized approver", () => {
        const fileConfig = { authorized_approvers: ["OWNER", "CONTRIBUTOR"] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.authorized_approvers).toEqual(["OWNER", "CONTRIBUTOR"]);
      });

      it("should accept all valid GitHub author associations", () => {
        const fileConfig = {
          authorized_approvers: [
            "OWNER",
            "MEMBER",
            "COLLABORATOR",
            "CONTRIBUTOR",
            "FIRST_TIME_CONTRIBUTOR",
            "FIRST_TIMER",
            "MANNEQUIN",
            "NONE",
          ],
        };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.authorized_approvers).toEqual([
          "OWNER",
          "MEMBER",
          "COLLABORATOR",
          "CONTRIBUTOR",
          "FIRST_TIME_CONTRIBUTOR",
          "FIRST_TIMER",
          "MANNEQUIN",
          "NONE",
        ]);
      });

      it("should reject invalid authorized_approvers value", () => {
        const fileConfig = { authorized_approvers: ["OWNER", "INVALID_VALUE"] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          'Invalid authorized_approvers value: "INVALID_VALUE"',
        );
      });

      it("should reject lowercase authorized_approvers value", () => {
        const fileConfig = { authorized_approvers: ["owner", "member"] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          'Invalid authorized_approvers value: "owner"',
        );
      });

      it("should reject empty string in authorized_approvers", () => {
        const fileConfig = { authorized_approvers: ["OWNER", ""] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow('Invalid authorized_approvers value: ""');
      });

      it("should use default authorized_approvers when not specified", () => {
        const fileConfig = {};
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        const result = mergeConfig(fileConfig, inputs);

        expect(result.authorized_approvers).toEqual(["OWNER", "MEMBER", "COLLABORATOR"]);
      });

      it("should list all valid associations in error message", () => {
        const fileConfig = { authorized_approvers: ["OWNER", "ADMIN"] };
        const inputs: ActionInputs = {
          mode: "plan",
          anthropic_api_key: "test-key",
          github_token: "test-token",
          config_path: ".leonidas.yml",
          system_prompt_path: ".github/leonidas.md",
        };

        expect(() => mergeConfig(fileConfig, inputs)).toThrow(
          "Must be one of: OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR, FIRST_TIMER, MANNEQUIN, NONE",
        );
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

    it("should include rules_path default in resolved config", () => {
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

      expect(result.rules_path).toBe(".github/leonidas-rules");
    });
  });

  describe("loadRules", () => {
    it("should load .md files from directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "coding-standards.md",
        "security.md",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce("# Coding Standards\nContent here")
        .mockReturnValueOnce("# Security\nSecurity guidelines");

      const result = loadRules(".github/rules");

      expect(fs.existsSync).toHaveBeenCalledWith(".github/rules");
      expect(fs.readdirSync).toHaveBeenCalledWith(".github/rules");
      expect(result).toEqual({
        "coding-standards": "# Coding Standards\nContent here",
        security: "# Security\nSecurity guidelines",
      });
    });

    it("should return empty object for non-existent directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadRules("/path/does/not/exist");

      expect(result).toEqual({});
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it("should return empty object for empty directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as fs.Dirent[]);

      const result = loadRules(".github/rules");

      expect(result).toEqual({});
    });

    it("should ignore non-.md files", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "rules.md",
        "readme.txt",
        "config.json",
        "other.MD",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue("# Rules Content");

      const result = loadRules(".github/rules");

      expect(Object.keys(result)).toEqual(["rules"]);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync).toHaveBeenCalledWith(".github/rules/rules.md", "utf-8");
    });

    it("should sort rules alphabetically", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true,
      } as fs.Stats);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "zebra.md",
        "alpha.md",
        "beta.md",
      ] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce("alpha content")
        .mockReturnValueOnce("beta content")
        .mockReturnValueOnce("zebra content");

      const result = loadRules(".github/rules");

      const keys = Object.keys(result);
      expect(keys).toEqual(["alpha", "beta", "zebra"]);
    });
  });
});
