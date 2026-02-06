import * as fs from "fs";
import * as yaml from "js-yaml";
import { LeonidasConfig, ActionInputs } from "./types";

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
    "Bash(gh pr:*)",
    "Bash(npx:*)",
    "Bash(node:*)",
  ],
  max_turns: 30,
  language: "en",
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
    merged.language = inputs.language;
  }

  return merged;
}

export function resolveConfig(inputs: ActionInputs): LeonidasConfig {
  const fileConfig = loadConfigFile(inputs.config_path);
  return mergeConfig(fileConfig, inputs);
}
