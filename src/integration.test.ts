import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { resolveConfig, loadRules } from "./config";
import { buildSystemPrompt } from "./prompts/system";
import { buildPlanPrompt, buildSubIssuePlanPrompt } from "./prompts/plan";
import { buildExecutePrompt } from "./prompts/execute";
import { ActionInputs, SubIssueMetadata } from "./types";

/**
 * Integration tests for config-to-prompt pipeline
 * These tests use real file I/O with temporary files to verify end-to-end flows
 */

describe("Config-to-Prompt Pipeline Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "leonidas-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper: Create a mock ActionInputs object
   */
  function createMockInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
    return {
      mode: "plan",
      anthropic_api_key: "test-key",
      github_token: "test-token",
      config_path: path.join(tempDir, ".leonidas.yml"),
      system_prompt_path: path.join(tempDir, ".leonidas", "SYSTEM.md"),
      ...overrides,
    };
  }

  /**
   * Helper: Write a config file to temp directory
   */
  function writeConfigFile(config: Record<string, unknown>): string {
    const configPath = path.join(tempDir, ".leonidas.yml");
    const yaml = Object.entries(config)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          const items = value.map((v) => `  - ${JSON.stringify(v)}`).join("\n");
          return `${key}:\n${items}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join("\n");
    fs.writeFileSync(configPath, yaml, "utf-8");
    return configPath;
  }

  /**
   * Helper: Write a system prompt override file
   */
  function writeSystemPrompt(content: string): string {
    const promptPath = path.join(tempDir, ".leonidas", "SYSTEM.md");
    fs.mkdirSync(path.dirname(promptPath), { recursive: true });
    fs.writeFileSync(promptPath, content, "utf-8");
    return promptPath;
  }

  /**
   * Helper: Create a rules directory with rule files
   */
  function createRulesDirectory(rules: Record<string, string>): string {
    const rulesPath = path.join(tempDir, "rules");
    fs.mkdirSync(rulesPath, { recursive: true });
    for (const [name, content] of Object.entries(rules)) {
      fs.writeFileSync(path.join(rulesPath, `${name}.md`), content, "utf-8");
    }
    return rulesPath;
  }

  describe("Plan Flow Integration", () => {
    it("should build complete plan prompt from config file", () => {
      // Arrange: Create config file
      writeConfigFile({
        model: "claude-opus-4-6",
        max_turns: 30,
        language: "en",
      });

      // Create system prompt override
      const systemPromptPath = writeSystemPrompt("# Custom System Instructions\n\nTest content");

      // Create rules directory
      const rulesPath = createRulesDirectory({
        "coding-style": "# Coding Style\n\nUse TypeScript strict mode",
        "testing": "# Testing\n\nWrite tests for all features",
      });

      const inputs = createMockInputs({
        system_prompt_path: systemPromptPath,
        rules_path: rulesPath,
      });

      // Act: Resolve config and build prompts
      const config = resolveConfig(inputs);
      const rules = loadRules(rulesPath);
      const systemPrompt = buildSystemPrompt(systemPromptPath, config.language, rules);
      const planPrompt = buildPlanPrompt(
        "Add user authentication",
        "## Summary\n\nImplement OAuth login",
        42,
        "owner/repo",
        systemPrompt,
        config.label,
        config.language,
      );

      // Assert: Verify config resolution
      expect(config.model).toBe("claude-opus-4-6");
      expect(config.max_turns).toBe(30);
      expect(config.language).toBe("en");

      // Assert: Verify system prompt structure
      expect(systemPrompt).toContain("Custom System Instructions");
      expect(systemPrompt).toContain("Repository-Specific Instructions");
      expect(systemPrompt).toContain("Test content");

      // Assert: Verify rules are included
      expect(systemPrompt).toContain("## Project Rules");
      expect(systemPrompt).toContain("Rule: coding-style");
      expect(systemPrompt).toContain("Use TypeScript strict mode");
      expect(systemPrompt).toContain("Rule: testing");
      expect(systemPrompt).toContain("Write tests for all features");

      // Assert: Verify plan prompt structure
      expect(planPrompt).toContain("Custom System Instructions");
      expect(planPrompt).toContain("Issue #42:");
      expect(planPrompt).toContain("Add user authentication");
      expect(planPrompt).toContain("Implement OAuth login");
      expect(planPrompt).toContain("Planning Methodology");
      expect(planPrompt).toContain("Phase 1: Discovery");
      expect(planPrompt).toContain("Implementation Steps");
      expect(planPrompt).toContain("gh issue comment 42");
    });

    it("should handle plan prompt with non-English language", () => {
      // Arrange: Create config with German language
      writeConfigFile({
        language: "de",
      });

      const inputs = createMockInputs();

      // Act: Resolve config and build prompts
      const config = resolveConfig(inputs);
      const systemPrompt = buildSystemPrompt(undefined, config.language);
      const planPrompt = buildPlanPrompt(
        "Feature hinzufügen",
        "Beschreibung",
        100,
        "owner/repo",
        systemPrompt,
        config.label,
        config.language,
      );

      // Assert: Verify language directive is included
      expect(systemPrompt).toContain("Language Configuration");
      expect(systemPrompt).toContain("German");

      // Assert: Verify plan prompt includes German language header
      expect(planPrompt).toContain("Implementierungsplan");
    });
  });

  describe("Execute Flow Integration", () => {
    it("should build complete execute prompt with turn budget and PR template", () => {
      // Arrange: Create config file
      writeConfigFile({
        max_turns: 50,
        branch_prefix: "feature/",
        base_branch: "develop",
      });

      const systemPromptPath = writeSystemPrompt("# Execute Mode Instructions");
      const rulesPath = createRulesDirectory({
        "commit-convention": "# Commits\n\nUse conventional commits",
      });

      const inputs = createMockInputs({
        mode: "execute",
        system_prompt_path: systemPromptPath,
        rules_path: rulesPath,
      });

      const planComment = `## 🏛️ Leonidas Implementation Plan

### Summary
Implement authentication feature

### Implementation Steps
- [ ] Step 1: Add auth module
- [ ] Step 2: Write tests

### Considerations
None

### Verification
Run tests`;

      // Act: Resolve config and build prompts
      const config = resolveConfig(inputs);
      const rules = loadRules(rulesPath);
      const systemPrompt = buildSystemPrompt(systemPromptPath, config.language, rules);
      const executePrompt = buildExecutePrompt({
        issueTitle: "Add authentication",
        issueBody: "Implement OAuth login flow",
        planComment,
        issueNumber: 42,
        branchPrefix: config.branch_prefix,
        baseBranch: config.base_branch,
        systemPrompt,
        maxTurns: config.max_turns,
        issueLabels: ["enhancement", "leonidas"],
        issueAuthor: "testuser",
        hasRules: Object.keys(rules).length > 0,
      });

      // Assert: Verify turn budget calculation
      expect(executePrompt).toContain("You have **50 turns** total");
      expect(executePrompt).toContain("By turn 45, you MUST have pushed your branch");

      // Assert: Verify PR template with custom branch settings
      expect(executePrompt).toContain("git checkout -b feature/42");
      expect(executePrompt).toContain("--base develop");
      expect(executePrompt).toContain("#42: Add authentication");

      // Assert: Verify labels and assignee are included
      expect(executePrompt).toContain('--add-label "enhancement"');
      expect(executePrompt).toContain('--add-assignee "testuser"');

      // Assert: Verify plan is included
      expect(executePrompt).toContain("Leonidas Implementation Plan");
      expect(executePrompt).toContain("Step 1: Add auth module");

      // Assert: Verify rules reference
      expect(executePrompt).toContain("## Project Rules");
      expect(executePrompt).toContain("custom rules defined");
    });

    it("should handle execute prompt without rules", () => {
      // Arrange: Config without rules
      writeConfigFile({ max_turns: 40 });

      const inputs = createMockInputs({ mode: "execute" });

      // Act
      const config = resolveConfig(inputs);
      const systemPrompt = buildSystemPrompt();
      const executePrompt = buildExecutePrompt({
        issueTitle: "Fix bug",
        issueBody: "Bug description",
        planComment: "Plan content",
        issueNumber: 10,
        branchPrefix: config.branch_prefix,
        baseBranch: config.base_branch,
        systemPrompt,
        maxTurns: config.max_turns,
        hasRules: false,
      });

      // Assert: Rules section should not appear
      expect(executePrompt).not.toContain("## Project Rules");
      expect(executePrompt).not.toContain("custom rules defined");
    });
  });

  describe("Sub-Issue Flow Integration", () => {
    it("should build sub-issue plan prompt with parent metadata", () => {
      // Arrange: Create config
      writeConfigFile({
        language: "en",
      });

      const systemPromptPath = writeSystemPrompt("# Sub-Issue Instructions");
      const inputs = createMockInputs({ system_prompt_path: systemPromptPath });

      const subIssueMetadata: SubIssueMetadata = {
        parent_issue_number: 100,
        order: 2,
        total: 4,
        depends_on: 101,
      };

      // Act: Build sub-issue plan prompt
      const config = resolveConfig(inputs);
      const systemPrompt = buildSystemPrompt(systemPromptPath, config.language);
      const subIssuePlanPrompt = buildSubIssuePlanPrompt(
        "[2/4] Implement data layer",
        "## Context\nPart of #100\n\n## Task\nBuild database models",
        102,
        "owner/repo",
        systemPrompt,
        subIssueMetadata,
        config.language,
      );

      // Assert: Verify sub-issue metadata is included
      expect(subIssuePlanPrompt).toContain("Sub-Issue #102");
      expect(subIssuePlanPrompt).toContain("[2/4] of parent issue #100");
      expect(subIssuePlanPrompt).toContain("This sub-issue depends on #101");

      // Assert: Verify decomposition constraints
      expect(subIssuePlanPrompt).toContain("DO NOT decompose this issue further");
      expect(subIssuePlanPrompt).toContain("Focus ONLY on the scope defined in this sub-issue");
      expect(subIssuePlanPrompt).toContain("Maximum 7 implementation steps");

      // Assert: Verify planning methodology is included
      expect(subIssuePlanPrompt).toContain("Planning Methodology");
      expect(subIssuePlanPrompt).toContain("Phase 1: Discovery");
    });

    it("should handle execute prompt for sub-issue", () => {
      // Arrange
      writeConfigFile({ max_turns: 50 });
      const inputs = createMockInputs({ mode: "execute" });

      const subIssueMetadata: SubIssueMetadata = {
        parent_issue_number: 100,
        order: 1,
        total: 3,
      };

      // Act
      const config = resolveConfig(inputs);
      const systemPrompt = buildSystemPrompt();
      const executePrompt = buildExecutePrompt({
        issueTitle: "[1/3] Setup infrastructure",
        issueBody: "Part of #100",
        planComment: "Plan for sub-issue",
        issueNumber: 101,
        branchPrefix: config.branch_prefix,
        baseBranch: config.base_branch,
        systemPrompt,
        maxTurns: config.max_turns,
        subIssueMetadata,
        hasRules: false,
      });

      // Assert: Verify sub-issue context
      expect(executePrompt).toContain("## Sub-Issue Context");
      expect(executePrompt).toContain("sub-issue **[1/3]** of parent issue #100");
      expect(executePrompt).toContain("Focus ONLY on the scope defined in this sub-issue");

      // Assert: Verify PR title format includes parent
      expect(executePrompt).toContain("#100 [1/3]: [1/3] Setup infrastructure");

      // Assert: Verify PR body references parent
      expect(executePrompt).toContain("Part of #100");
      expect(executePrompt).toContain("Closes #101");
    });
  });

  describe("Edge Cases", () => {
    it("should use defaults when config file is missing", () => {
      // Arrange: No config file created
      const inputs = createMockInputs({
        config_path: path.join(tempDir, "nonexistent.yml"),
      });

      // Act: Resolve config
      const config = resolveConfig(inputs);

      // Assert: All default values are used
      expect(config.label).toBe("leonidas");
      expect(config.model).toBe("claude-sonnet-4-5-20250929");
      expect(config.branch_prefix).toBe("claude/issue-");
      expect(config.base_branch).toBe("main");
      expect(config.max_turns).toBe(50);
      expect(config.language).toBe("en");
      expect(config.allowed_tools).toContain("Read");
      expect(config.allowed_tools).toContain("Write");
    });

    it("should handle empty rules directory", () => {
      // Arrange: Create empty rules directory
      const rulesPath = path.join(tempDir, "empty-rules");
      fs.mkdirSync(rulesPath, { recursive: true });

      // Act: Load rules from empty directory
      const rules = loadRules(rulesPath);
      const systemPrompt = buildSystemPrompt(undefined, "en", rules);

      // Assert: No rules are loaded
      expect(Object.keys(rules)).toHaveLength(0);
      expect(systemPrompt).not.toContain("## Project Rules");
    });

    it("should handle invalid YAML and fall back to defaults", () => {
      // Arrange: Write invalid YAML
      const configPath = path.join(tempDir, ".leonidas.yml");
      fs.writeFileSync(configPath, "invalid: yaml: content: [[[", "utf-8");

      const inputs = createMockInputs({ config_path: configPath });

      // Act: Resolve config
      const config = resolveConfig(inputs);

      // Assert: Falls back to defaults
      expect(config.model).toBe("claude-sonnet-4-5-20250929");
      expect(config.max_turns).toBe(50);
    });

    it("should handle all-defaults scenario (no file, no overrides)", () => {
      // Arrange: No config file, no input overrides
      const inputs = createMockInputs({
        config_path: path.join(tempDir, "missing.yml"),
        system_prompt_path: path.join(tempDir, "missing.md"),
      });

      // Act: Full pipeline with defaults
      const config = resolveConfig(inputs);
      const rules = loadRules(config.rules_path);
      const systemPrompt = buildSystemPrompt(undefined, config.language, rules);
      const planPrompt = buildPlanPrompt(
        "Test issue",
        "Test body",
        1,
        "owner/repo",
        systemPrompt,
        config.label,
        config.language,
      );

      // Assert: Complete prompt is built with defaults
      expect(config.label).toBe("leonidas");
      expect(config.model).toBe("claude-sonnet-4-5-20250929");
      expect(planPrompt).toContain("Issue #1:");
      expect(planPrompt).toContain("Test issue");
      expect(planPrompt).toContain("Planning Methodology");
      expect(planPrompt).toContain("gh issue comment 1");
    });

    it("should handle missing rules directory", () => {
      // Arrange: Rules path points to non-existent directory
      const rulesPath = path.join(tempDir, "nonexistent-rules");

      // Act: Load rules from non-existent directory
      const rules = loadRules(rulesPath);

      // Assert: Returns empty object, no error
      expect(rules).toEqual({});
      expect(Object.keys(rules)).toHaveLength(0);
    });

    it("should validate and reject invalid config values", () => {
      // Arrange: Create config with invalid max_turns
      writeConfigFile({
        max_turns: 300, // Exceeds MAX_MAX_TURNS (200)
      });

      const inputs = createMockInputs();

      // Act & Assert: Should throw validation error
      expect(() => resolveConfig(inputs)).toThrow(
        "max_turns must be between 10 and 200, got 300",
      );
    });

    it("should handle config file that is not a directory for rules_path", () => {
      // Arrange: Create a file instead of directory for rules
      const rulesPath = path.join(tempDir, "rules-file.txt");
      fs.writeFileSync(rulesPath, "This is a file, not a directory", "utf-8");

      // Act: Try to load rules from file
      const rules = loadRules(rulesPath);

      // Assert: Returns empty object since it's not a directory
      expect(rules).toEqual({});
    });
  });
});
