/**
 * Internationalization (i18n) module for Leonidas
 * Supports multiple languages with translation keys and string interpolation
 */

/**
 * Supported languages for the Leonidas system
 */
export type SupportedLanguage = "en" | "ko" | "ja" | "zh" | "es";

/**
 * Type guard to check if a string is a supported language code
 * @param lang - The language code to check
 * @returns true if the language is supported, false otherwise
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === "string" && ["en", "ko", "ja", "zh", "es"].includes(lang);
}

/**
 * Resolves a language code to a supported language, with fallback to English
 * @param lang - The language code to resolve
 * @returns A valid SupportedLanguage, defaulting to "en" if invalid
 */
export function resolveLanguage(lang: unknown): SupportedLanguage {
  return isSupportedLanguage(lang) ? lang : "en";
}

/**
 * Translation keys used throughout the Leonidas system
 */
export type TranslationKey = "plan_header" | "plan_footer" | "decomposed_plan_footer";

/**
 * Translation map containing all localized strings for supported languages
 */
const translations: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  en: {
    plan_header: "## 🏛️ Leonidas Implementation Plan",
    plan_footer: "---\n> To approve this plan and start implementation, comment `/approve` on this issue.",
    decomposed_plan_footer: "---\n> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting `/approve` on each one.",
  },
  ko: {
    plan_header: "## 🏛️ 레오니다스 구현 계획",
    plan_footer: "---\n> 이 계획을 승인하고 구현을 시작하려면 이 이슈에 `/approve`를 댓글로 작성하세요.",
    decomposed_plan_footer: "---\n> 이 이슈는 하위 이슈로 분해되었습니다. 각 하위 이슈에 `/approve`를 댓글로 작성하여 개별적으로 승인하고 실행하세요.",
  },
  ja: {
    plan_header: "## 🏛️ レオニダス実装計画",
    plan_footer: "---\n> この計画を承認して実装を開始するには、このissueに `/approve` とコメントしてください。",
    decomposed_plan_footer: "---\n> このissueはサブissueに分解されました。各サブissueに `/approve` とコメントして、個別に承認して実行してください。",
  },
  zh: {
    plan_header: "## 🏛️ 列奥尼达实施计划",
    plan_footer: "---\n> 要批准此计划并开始实施，请在此问题上评论 `/approve`。",
    decomposed_plan_footer: "---\n> 此问题已分解为子问题。请在每个子问题上评论 `/approve` 以分别批准和执行。",
  },
  es: {
    plan_header: "## 🏛️ Plan de Implementación de Leonidas",
    plan_footer: "---\n> Para aprobar este plan e iniciar la implementación, comenta `/approve` en este issue.",
    decomposed_plan_footer: "---\n> Este issue ha sido descompuesto en sub-issues. Aprueba y ejecuta cada sub-issue individualmente comentando `/approve` en cada uno.",
  },
};

/**
 * Translation function that retrieves localized strings and performs string interpolation
 * @param key - The translation key to look up
 * @param lang - The language code (defaults to "en")
 * @param args - Values to interpolate into the string (%d for numbers, %s for strings)
 * @returns The translated and interpolated string
 */
export function t(key: TranslationKey, lang: SupportedLanguage = "en", ...args: (string | number)[]): string {
  const resolvedLang = resolveLanguage(lang);
  const template = translations[resolvedLang][key];

  if (!template) {
    return `[Missing translation: ${key}]`;
  }

  if (args.length === 0) {
    return template;
  }

  // Replace placeholders with provided arguments
  let result = template;
  let argIndex = 0;

  // Replace %d and %s placeholders sequentially
  result = result.replace(/%[ds]/g, (match) => {
    if (argIndex >= args.length) {
      return match; // No more arguments, leave placeholder as-is
    }
    const arg = args[argIndex++];
    return String(arg);
  });

  return result;
}
