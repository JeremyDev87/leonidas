import * as fs from "fs";
import * as yaml from "js-yaml";
import { LeonidasConfig, ActionInputs } from "./types";
import { resolveLanguage } from "./i18n";

const DEFAULT_CONFIG: LeonidasConfig = {
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
};

export function loadConfigFile(configPath: string): Partial<LeonidasConfig> {
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return (yaml.load(content) as Partial<LeonidasConfig>) ?? {};
  } catch {
    return {};
  }
}

export function mergeConfig(
  fileConfig: Partial<LeonidasConfig>,
  inputs: ActionInputs,
): LeonidasConfig {
  const merged = { ...DEFAULT_CONFIG, ...fileConfig };

  if (inputs.model) {
    merged.model = inputs.model;
  }
  if (inputs.max_turns !== undefined) {
    merged.max_turns = inputs.max_turns;
  }
  if (inputs.allowed_tools) {
    merged.allowed_tools = inputs.allowed_tools.split(",").map((t) => t.trim());
  }
  if (inputs.branch_prefix) {
    merged.branch_prefix = inputs.branch_prefix;
  }
  if (inputs.base_branch) {
    merged.base_branch = inputs.base_branch;
  }
  if (inputs.language) {
    merged.language = resolveLanguage(inputs.language);
  }
  if (inputs.rules_path) {
    merged.rules_path = inputs.rules_path;
  }

  // Validate label format: alphanumeric, hyphens, underscores only
  if (!/^[a-zA-Z0-9_-]+$/.test(merged.label)) {
    throw new Error(
      `Invalid label format: "${merged.label}". Labels must contain only alphanumeric characters, hyphens, and underscores.`,
    );
  }

  return merged;
}

export function loadRules(rulesPath: string): Record<string, string> {
  try {
    // Check if directory exists
    if (!fs.existsSync(rulesPath)) {
      return {};
    }

    const stat = fs.statSync(rulesPath);
    if (!stat.isDirectory()) {
      return {};
    }

    // Read all .md files from the directory
    const files = fs.readdirSync(rulesPath);
    const mdFiles = files.filter((file) => file.endsWith(".md")).sort();

    const rules: Record<string, string> = {};
    for (const file of mdFiles) {
      const filePath = `${rulesPath}/${file}`;
      const ruleName = file.replace(/\.md$/, "");
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        rules[ruleName] = content;
      } catch {
        // Skip files that can't be read
      }
    }

    return rules;
  } catch {
    return {};
  }
}

export function resolveConfig(inputs: ActionInputs): LeonidasConfig {
  const fileConfig = loadConfigFile(inputs.config_path);
  return mergeConfig(fileConfig, inputs);
}
