/**
 * Wraps user-supplied content in delimiters to prevent prompt injection attacks.
 *
 * This function encapsulates untrusted user input (like issue titles and bodies)
 * within XML-style tags to help the LLM distinguish between system instructions
 * and user-provided data.
 *
 * @param content - The user-supplied content to wrap
 * @returns The content wrapped in <user-supplied-content> delimiters
 *
 * @example
 * ```typescript
 * const safeContent = wrapUserContent("User's issue description");
 * // Returns: "<user-supplied-content>\nUser's issue description\n</user-supplied-content>"
 * ```
 */
export function wrapUserContent(content: string): string {
  // Escape delimiter tags — case-insensitive and whitespace-tolerant to prevent bypass
  const escapedContent = content
    .replace(/<\s*user-supplied-content\s*>/gi, "&lt;user-supplied-content&gt;")
    .replace(/<\s*\/\s*user-supplied-content\s*>/gi, "&lt;/user-supplied-content&gt;");

  return `<user-supplied-content>\n${escapedContent}\n</user-supplied-content>`;
}

/**
 * Wraps repository-provided configuration content in delimiters.
 *
 * Used for content from trusted-but-not-system sources like repository rules
 * and custom system prompt files. These come from the repo (not directly from
 * users via issues/comments), but could be modified by contributors.
 *
 * @param content - Repository configuration content
 * @returns The content wrapped in <repository-configuration> delimiters
 */
export function wrapRepoConfiguration(content: string): string {
  const escapedContent = content
    .replace(/<\s*repository-configuration\s*>/gi, "&lt;repository-configuration&gt;")
    .replace(/<\s*\/\s*repository-configuration\s*>/gi, "&lt;/repository-configuration&gt;");

  return `<repository-configuration>\n${escapedContent}\n</repository-configuration>`;
}

/**
 * Escapes shell metacharacters in a string for safe interpolation into
 * shell command templates within prompts.
 *
 * This prevents command injection when user-controlled values (like issue titles)
 * are embedded in shell commands that the LLM is instructed to execute.
 *
 * Escapes double quotes, single quotes, backticks, dollar signs, backslashes,
 * exclamation marks, newlines, and carriage returns. Also strips control characters.
 *
 * @param value - The value to escape for shell interpolation
 * @returns The shell-safe escaped string
 */
export function escapeForShellArg(value: string): string {
  // Replace double quotes, single quotes, backticks, dollar signs, backslashes,
  // newlines, carriage returns, and other shell metacharacters that could
  // break out of a quoted string, then strip control characters
  return (
    value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$")
      .replace(/!/g, "\\!")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/g, "")
  );
}

/**
 * Escapes an array of strings for safe interpolation into shell command templates.
 * Each element is individually escaped and joined with commas.
 *
 * @param values - The array of values to escape for shell interpolation
 * @returns The shell-safe escaped string with comma-separated values
 */
export function escapeArrayForShellArg(values: string[]): string {
  return values.map(escapeForShellArg).join(",");
}
