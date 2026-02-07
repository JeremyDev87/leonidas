import { vi } from "vitest";
import * as core from "@actions/core";
import * as fs from "fs";
import type { LeonidasConfig } from "../types";
import type { SupportedLanguage } from "../i18n";

/**
 * Factory for creating mock inputs for core.getInput
 */
export function mockInputs(overrides: Partial<Record<string, string>> = {}) {
  const defaults: Record<string, string> = {
    mode: "plan",
    anthropic_api_key: "test-api-key",
    github_token: "test-github-token",
    model: "",
    max_turns: "",
    allowed_tools: "",
    branch_prefix: "",
    base_branch: "",
    language: "",
    config_path: "leonidas.config.yml",
    system_prompt_path: ".github/leonidas.md",
    rules_path: "",
  };

  const inputs = { ...defaults, ...overrides };

  vi.mocked(core.getInput).mockImplementation((name: string, _options?: core.InputOptions) => {
    return inputs[name] ?? "";
  });

  return inputs;
}

/**
 * Factory for creating mock GitHub event payloads
 */
export function mockGitHubEvent(
  overrides: Partial<{
    issue: {
      number: number;
      title: string;
      body: string;
      labels: { name: string }[];
      user: { login: string };
    };
    comment: {
      author_association: string;
    };
  }> = {},
) {
  const defaults = {
    issue: {
      number: 1,
      title: "Test Issue",
      body: "Test body",
      labels: [],
      user: { login: "testuser" },
    },
    comment: {
      author_association: "",
    },
  };

  const event = {
    issue: overrides.issue ? { ...defaults.issue, ...overrides.issue } : defaults.issue,
    comment: overrides.comment ? { ...defaults.comment, ...overrides.comment } : defaults.comment,
  };

  vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(event));

  return event;
}

/**
 * Factory for creating mock config objects
 */
export function mockConfig(overrides: Partial<LeonidasConfig> = {}): LeonidasConfig {
  return {
    label: "leonidas",
    model: "claude-sonnet-4-5-20250929",
    branch_prefix: "claude/issue-",
    base_branch: "main",
    allowed_tools: ["Read"],
    max_turns: 50,
    language: "en" as SupportedLanguage,
    rules_path: ".github/leonidas-rules",
    authorized_approvers: [],
    ...overrides,
  };
}

/**
 * Factory for creating mock prompt builder functions
 */
export function mockPromptBuilders() {
  return {
    buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
    buildPlanPrompt: vi.fn().mockReturnValue("plan prompt"),
    buildSubIssuePlanPrompt: vi.fn().mockReturnValue("sub-issue plan prompt"),
    buildExecutePrompt: vi.fn().mockReturnValue("execute prompt"),
  };
}

/**
 * Setup environment variables for tests
 */
export function setupTestEnvironment(
  overrides: {
    GITHUB_EVENT_PATH?: string;
    GITHUB_REPOSITORY?: string;
    RUNNER_TEMP?: string;
  } = {},
) {
  process.env.GITHUB_EVENT_PATH = overrides.GITHUB_EVENT_PATH ?? "/tmp/event.json";
  process.env.GITHUB_REPOSITORY = overrides.GITHUB_REPOSITORY ?? "owner/repo";
  if (overrides.RUNNER_TEMP) {
    process.env.RUNNER_TEMP = overrides.RUNNER_TEMP;
  }
}

/**
 * Cleanup environment variables after tests
 */
export function cleanupTestEnvironment() {
  delete process.env.GITHUB_EVENT_PATH;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.RUNNER_TEMP;
}

/**
 * Setup common mocks for tests
 */
export function setupCommonMocks() {
  vi.mocked(fs.writeFileSync).mockImplementation(() => {
    /* noop */
  });
  vi.mocked(core.setOutput).mockImplementation(() => {
    /* noop */
  });
  vi.mocked(core.setFailed).mockImplementation(() => {
    /* noop */
  });
}
