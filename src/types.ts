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
  rules_path: string;
  authorized_approvers: string[];
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
  rules_path?: string;
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
  comment_author_association: string;
}

export interface GitHubRepo {
  token: string;
  owner: string;
  repo: string;
}

export interface IssueData {
  title: string;
  body: string | null;
  user: { login: string } | null;
  labels: ({ name?: string } | string)[];
  state: string;
}

export interface GitHubClient {
  findPlanComment(issueNumber: number): Promise<string | null>;
  isIssueClosed(issueNumber: number): Promise<boolean>;
  postComment(issueNumber: number, body: string): Promise<void>;
  linkSubIssues(parentIssueNumber: number, subIssueNumbers: number[]): Promise<LinkSubIssuesResult>;
  getPRForBranch(branchName: string): Promise<number | undefined>;
  branchExistsOnRemote(branchName: string): Promise<boolean>;
  createDraftPR(
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<string | undefined>;
  postProcessPR(issueNumber: number, branchPrefix: string): Promise<void>;
  triggerCI(branchName: string, workflowFile?: string): Promise<void>;
  getIssue(issueNumber: number): Promise<IssueData>;
  getOpenPRForBranch(branchName: string): Promise<number | undefined>;
}

export interface LinkSubIssuesResult {
  linked: number;
  failed: number;
}
