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
  // Handle the case where user content already contains the delimiter
  // by replacing any existing delimiter tags to prevent escaping
  const escapedContent = content
    .replace(/<user-supplied-content>/g, '&lt;user-supplied-content&gt;')
    .replace(/<\/user-supplied-content>/g, '&lt;/user-supplied-content&gt;');

  return `<user-supplied-content>\n${escapedContent}\n</user-supplied-content>`;
}
