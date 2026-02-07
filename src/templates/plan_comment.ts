import { t, SupportedLanguage } from "../i18n";

/** English plan header — used as backward-compat fallback in findPlanComment() */
export const PLAN_HEADER = "## 🏛️ Leonidas Implementation Plan";

export const PLAN_MARKER = "<!-- leonidas-plan -->";
export const DECOMPOSED_MARKER = "<!-- leonidas-decomposed -->";

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
