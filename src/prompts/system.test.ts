import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { buildSystemPrompt } from "./system";

vi.mock("fs");
vi.mock("path");

describe("prompts/system", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("buildSystemPrompt", () => {
    it("should load default system prompt successfully", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default system instructions from file.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt();

      expect(path.join).toHaveBeenCalledWith("/action/path", "prompts/system.md");
      expect(fs.readFileSync).toHaveBeenCalledWith("/action/path/prompts/system.md", "utf-8");
      expect(result).toBe(defaultPrompt);
    });

    it("should use fallback prompt when default file not found", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const result = buildSystemPrompt();

      expect(result).toBe("You are an automated implementation agent.");
    });

    it("should use __dirname when GITHUB_ACTION_PATH is not set", () => {
      delete process.env.GITHUB_ACTION_PATH;

      vi.mocked(path.join).mockImplementation((...args: string[]) => {
        if (args[1] === "..") {
          return "/some/action/root";
        }
        return "/some/action/root/prompts/system.md";
      });
      vi.mocked(fs.readFileSync).mockReturnValue("Default prompt");

      const result = buildSystemPrompt();

      expect(result).toBe("Default prompt");
    });

    it("should append user override when provided and file exists", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";
      const userOverride = "User-specific instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/repo/.leonidas/system.md");

      expect(fs.readFileSync).toHaveBeenCalledWith("/action/path/prompts/system.md", "utf-8");
      expect(fs.readFileSync).toHaveBeenCalledWith("/repo/.leonidas/system.md", "utf-8");
      expect(result).toBe(
        "Default instructions.\n\n## Repository-Specific Instructions\n\nUser-specific instructions.",
      );
    });

    it("should skip user override silently when file not found", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockImplementationOnce(() => {
          throw new Error("ENOENT: no such file or directory");
        });

      const result = buildSystemPrompt("/repo/.leonidas/system.md");

      expect(result).toBe("Default instructions.");
    });

    it("should work when both default and user override load successfully", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default prompt text";
      const userOverride = "Custom repo instructions";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/custom/path.md");

      expect(result).toContain("Default prompt text");
      expect(result).toContain("## Repository-Specific Instructions");
      expect(result).toContain("Custom repo instructions");
    });

    it("should use fallback when default fails and skip user override when it fails", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("File read error");
      });

      const result = buildSystemPrompt("/user/override.md");

      expect(result).toBe("You are an automated implementation agent.");
    });

    it("should not include user override section when no path provided", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt();

      expect(result).toBe("Default instructions.");
      expect(result).not.toContain("## Repository-Specific Instructions");
    });

    it("should handle empty user override file", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValueOnce(defaultPrompt).mockReturnValueOnce("");

      const result = buildSystemPrompt("/repo/override.md");

      expect(result).toBe("Default instructions.\n\n## Repository-Specific Instructions\n\n");
    });

    it("should handle multiline user override", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";
      const userOverride = "Line 1\nLine 2\nLine 3";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/repo/override.md");

      expect(result).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should use fallback and append user override when default fails but override succeeds", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const userOverride = "Custom instructions";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockImplementationOnce(() => {
          throw new Error("Default file not found");
        })
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/repo/override.md");

      expect(result).toBe(
        "You are an automated implementation agent.\n\n## Repository-Specific Instructions\n\nCustom instructions",
      );
    });

    it("should not include language directive for English (default)", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "en");

      expect(result).toBe("Default instructions.");
      expect(result).not.toContain("## Language Configuration");
      expect(result).not.toContain("IMPORTANT");
    });

    it("should include language directive for Korean", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "ko");

      expect(result).toContain("Default instructions.");
      expect(result).toContain("## Language Configuration");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Korean",
      );
      expect(result).toContain("Write all plan comments in Korean");
    });

    it("should include language directive for Japanese", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "ja");

      expect(result).toContain("## Language Configuration");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Japanese",
      );
    });

    it("should include language directive for Chinese", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "zh");

      expect(result).toContain("## Language Configuration");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Chinese",
      );
    });

    it("should include language directive for Spanish", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "es");

      expect(result).toContain("## Language Configuration");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Spanish",
      );
    });

    it("should include language directive after user override", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";
      const userOverride = "Custom instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/repo/override.md", "ko");

      expect(result).toContain("Default instructions.");
      expect(result).toContain("## Repository-Specific Instructions");
      expect(result).toContain("Custom instructions.");
      expect(result).toContain("## Language Configuration");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Korean",
      );
    });
  });

  describe("buildSystemPrompt with rules", () => {
    it("should include rules when provided", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";
      const rules = {
        "plan-quality": "# Plan Quality\n\nEnsure plans are specific.",
        "coding-standards": "# Coding Standards\n\nFollow conventions.",
      };

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "en", rules);

      expect(result).toContain("Default instructions.");
      expect(result).toContain("## Project Rules");
      expect(result).toContain("### Rule: plan-quality");
      expect(result).toContain("# Plan Quality");
      expect(result).toContain("Ensure plans are specific.");
      expect(result).toContain("### Rule: coding-standards");
      expect(result).toContain("# Coding Standards");
      expect(result).toContain("Follow conventions.");
    });

    it("should omit rules section when no rules provided", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync).mockReturnValue(defaultPrompt);

      const result = buildSystemPrompt(undefined, "en");

      expect(result).toBe("Default instructions.");
      expect(result).not.toContain("## Project Rules");
    });

    it("should place rules after user override and before language directive", () => {
      process.env.GITHUB_ACTION_PATH = "/action/path";
      const defaultPrompt = "Default instructions.";
      const userOverride = "Custom instructions.";
      const rules = {
        tdd: "# TDD Guidelines\n\nWrite tests first.",
      };

      vi.mocked(path.join).mockReturnValue("/action/path/prompts/system.md");
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(defaultPrompt)
        .mockReturnValueOnce(userOverride);

      const result = buildSystemPrompt("/repo/override.md", "ja", rules);

      // Verify order: default -> user override -> rules -> language
      const defaultIndex = result.indexOf("Default instructions.");
      const userOverrideIndex = result.indexOf("## Repository-Specific Instructions");
      const rulesIndex = result.indexOf("## Project Rules");
      const languageIndex = result.indexOf("## Language Configuration");

      expect(defaultIndex).toBeGreaterThan(-1);
      expect(userOverrideIndex).toBeGreaterThan(defaultIndex);
      expect(rulesIndex).toBeGreaterThan(userOverrideIndex);
      expect(languageIndex).toBeGreaterThan(rulesIndex);

      expect(result).toContain("Custom instructions.");
      expect(result).toContain("### Rule: tdd");
      expect(result).toContain("# TDD Guidelines");
      expect(result).toContain(
        "All responses, comments, commit messages, and output MUST be in Japanese",
      );
    });
  });
});
