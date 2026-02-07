/**
 * Post-processing module for Leonidas
 * Builds messages for completion, partial progress, and failure comments
 */

import { t, SupportedLanguage } from "./i18n";
import { LeonidasMode } from "./types";

/**
 * Parameters for building a completion comment
 */
export interface CompletionCommentParams {
  issueNumber: number;
  prNumber?: string;
  language: SupportedLanguage;
  runUrl: string;
}

/**
 * Parameters for building a partial progress comment
 */
export interface PartialProgressCommentParams {
  issueNumber: number;
  existingPR?: string;
  draftPRUrl?: string;
  language: SupportedLanguage;
  runUrl: string;
}

/**
 * Parameters for building a failure comment
 */
export interface FailureCommentParams {
  issueNumber: number;
  mode: LeonidasMode;
  language: SupportedLanguage;
  runUrl: string;
}

/**
 * Parameters for building a rescue PR title and body
 */
export interface RescuePRParams {
  issueNumber: number;
  issueTitle: string;
  parentNumber?: number;
  language: SupportedLanguage;
  runUrl: string;
}

/**
 * Builds a completion comment posted after successful execution
 */
export function buildCompletionComment(params: CompletionCommentParams): string {
  const { issueNumber, prNumber, language, runUrl } = params;
  if (prNumber) {
    return t("completion_with_pr", language, issueNumber, prNumber);
  }
  return t("completion_no_pr", language, issueNumber, runUrl);
}

/**
 * Builds a partial progress comment posted when execution is interrupted
 */
export function buildPartialProgressComment(params: PartialProgressCommentParams): string {
  const { existingPR, draftPRUrl, language, runUrl } = params;
  const header = t("partial_header", language);

  let body: string;
  if (existingPR) {
    body = t("partial_pr_exists", language, existingPR, runUrl);
  } else if (draftPRUrl) {
    body = t("partial_draft_created", language, draftPRUrl, runUrl);
  } else {
    return header;
  }

  return `${header}\n\n${body}`;
}

/**
 * Builds a failure comment posted when execution fails
 */
export function buildFailureComment(params: FailureCommentParams): string {
  const { mode, language, runUrl } = params;
  const header = t("failure_header", language);
  const body =
    mode === "plan"
      ? t("failure_plan_body", language, runUrl)
      : t("failure_execute_body", language, runUrl);

  return `${header}\n\n${body}`;
}

/**
 * Builds a PR title for rescue draft PRs
 */
export function buildRescuePRTitle(params: RescuePRParams): string {
  const { issueNumber, issueTitle, parentNumber } = params;
  if (parentNumber) {
    return `#${parentNumber} ${issueTitle} [partial]`;
  }
  return `#${issueNumber}: ${issueTitle} [partial]`;
}

/**
 * Builds a PR body for rescue draft PRs
 */
export function buildRescuePRBody(params: RescuePRParams): string {
  const { issueNumber, parentNumber, language, runUrl } = params;
  const header = t("partial_pr_body_header", language);
  const content = t("partial_pr_body", language, runUrl, issueNumber);

  if (parentNumber) {
    return `Part of #${parentNumber}\n\n${header}\n\n${content}`;
  }
  return `${header}\n\n${content}`;
}
