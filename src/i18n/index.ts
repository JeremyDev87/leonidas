/**
 * Internationalization (i18n) module for Leonidas
 * Supports multiple languages with translation keys and string interpolation
 */

import { translations, SupportedLanguage, TranslationKey } from "./translations";

/**
 * Supported languages for the Leonidas system (single source of truth)
 */
const SUPPORTED_LANGUAGES = ["en", "ko", "ja", "zh", "es", "de", "fr", "pt"] as const;

/**
 * Display names for supported languages
 */
export const LANGUAGE_DISPLAY_NAMES = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  de: "German",
  fr: "French",
  pt: "Portuguese",
} as const satisfies Record<SupportedLanguage, string>;

/**
 * Type guard to check if a string is a supported language code
 * @param lang - The language code to check
 * @returns true if the language is supported, false otherwise
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
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
 * Translation function that retrieves localized strings and performs string interpolation
 * @param key - The translation key to look up
 * @param lang - The language code (defaults to "en")
 * @param args - Values to interpolate into the string (%d for numbers, %s for strings)
 * @returns The translated and interpolated string
 */
export function t(
  key: TranslationKey,
  lang: SupportedLanguage = "en",
  ...args: (string | number)[]
): string {
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

// Re-export types
export type { SupportedLanguage, TranslationKey };
