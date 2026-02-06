import { t, SupportedLanguage } from "../i18n";

/**
 * @deprecated Use getPlanHeader() instead for i18n support
 */
export const PLAN_HEADER = "## 🏛️ Leonidas Implementation Plan";

/**
 * @deprecated Use getPlanFooter() instead for i18n support
 */
export const PLAN_FOOTER = `---
> To approve this plan and start implementation, comment \`/approve\` on this issue.`;

export const DECOMPOSED_MARKER = "<!-- leonidas-decomposed -->";

/**
 * @deprecated Use getDecomposedPlanFooter() instead for i18n support
 */
export const DECOMPOSED_PLAN_FOOTER = `---
> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting \`/approve\` on each one.`;

/**
 * Get the localized plan header
 * @param lang - The language code (defaults to "en")
 * @returns The localized plan header
 */
export function getPlanHeader(lang: SupportedLanguage = "en"): string {
  return t("plan_header", lang);
}

/**
 * Get the localized plan footer
 * @param lang - The language code (defaults to "en")
 * @returns The localized plan footer
 */
export function getPlanFooter(lang: SupportedLanguage = "en"): string {
  return t("plan_footer", lang);
}

/**
 * Get the localized decomposed plan footer
 * @param lang - The language code (defaults to "en")
 * @returns The localized decomposed plan footer
 */
export function getDecomposedPlanFooter(lang: SupportedLanguage = "en"): string {
  return t("decomposed_plan_footer", lang);
}

export function formatPlanComment(
  summary: string,
  steps: string[],
  considerations: string,
  verification: string,
): string {
  const stepsList = steps.map((step, i) => `- [ ] **Step ${i + 1}:** ${step}`).join("\n");

  return `${PLAN_HEADER}

### Summary
${summary}

### Implementation Steps
${stepsList}

### Considerations
${considerations}

### Verification
${verification}

${PLAN_FOOTER}
`;
}
