import * as fs from "fs";
import * as path from "path";

export function buildSystemPrompt(userOverridePath?: string): string {
  const defaultPromptPath = path.join(__dirname, "../../prompts/system.md");
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

  return systemPrompt;
}
