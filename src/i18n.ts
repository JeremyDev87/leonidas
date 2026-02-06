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
