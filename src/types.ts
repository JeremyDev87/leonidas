import { SupportedLanguage } from "./i18n";

export type LeonidasMode = "plan" | "execute";

export interface LeonidasConfig {
  label: string;
  model: string;
  branch_prefix: string;
  base_branch: string;
  allowed_tools: string[];
  max_turns: number;
  language: SupportedLanguage;
}

export interface ActionInputs {
  mode: LeonidasMode;
  anthropic_api_key: string;
  github_token: string;
  model?: string;
  max_turns?: number;
  allowed_tools?: string;
  branch_prefix?: string;
  base_branch?: string;
  language?: string;
  config_path: string;
  system_prompt_path: string;
}

export interface SubIssueMetadata {
  parent_issue_number: number;
  order: number;
  total: number;
  depends_on?: number;
}

export interface GitHubContext {
  owner: string;
  repo: string;
  issue_number: number;
  issue_title: string;
  issue_body: string;
  issue_labels: string[];
  issue_author: string;
}
