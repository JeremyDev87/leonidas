import * as fs from "fs";
import * as path from "path";
import { SupportedLanguage } from "../i18n";

/**
 * Get language directive for non-English languages
 * @param lang - The language code
 * @returns Language directive string, or empty string for English
 */
function getLanguageDirective(lang: SupportedLanguage): string {
  if (lang === "en") {
    return "";
  }

  const languageNames: Record<SupportedLanguage, string> = {
    en: "English",
    ko: "Korean",
    ja: "Japanese",
    zh: "Chinese",
    es: "Spanish",
  };

  const languageName = languageNames[lang];

  return `

---

## Language Configuration

**IMPORTANT:** All responses, comments, commit messages, and output MUST be in ${languageName}.

- Write all plan comments in ${languageName}
- Write all GitHub issue comments in ${languageName}
- Write all status messages in ${languageName}
- Use ${languageName} for all user-facing text

This is a critical requirement for this execution.`;
}

export function buildSystemPrompt(
  userOverridePath?: string,
  language: SupportedLanguage = "en",
): string {
  const actionRoot = process.env.GITHUB_ACTION_PATH ?? path.join(__dirname, "..");
  const defaultPromptPath = path.join(actionRoot, "prompts/system.md");
  let systemPrompt = "";

  try {
    systemPrompt = fs.readFileSync(defaultPromptPath, "utf-8");
  } catch {
    systemPrompt = "You are an automated implementation agent.";
  }

  if (userOverridePath) {
    try {
      const userPrompt = fs.readFileSync(userOverridePath, "utf-8");
      systemPrompt += `\n\n## Repository-Specific Instructions\n\n${userPrompt}`;
    } catch {
      // User override file not found, skip silently
    }
  }

  // Append language directive for non-English languages
  systemPrompt += getLanguageDirective(language);

  return systemPrompt;
}
