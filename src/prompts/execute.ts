export function buildExecutePrompt(
  issueTitle: string,
  issueBody: string,
  planComment: string,
  issueNumber: number,
): string {
  return `You are implementing code changes based on an approved plan.

## Issue #${issueNumber}: ${issueTitle}

${issueBody}

## Approved Plan

${planComment}

## Instructions

1. Follow the implementation plan step by step.
2. For each step:
   - Implement the changes described
   - Make an atomic commit with a clear message: \`step N: <description>\`
   - Verify the changes work before moving to the next step
3. After all steps are complete:
   - Run any relevant tests or build commands
   - Ensure all changes are committed
4. Create a pull request:
   - Title: \`#${issueNumber}: ${issueTitle}\`
   - Body must include \`Closes #${issueNumber}\` to auto-close the issue
   - Include a summary of all changes made
   - Use: \`gh pr create --title "#${issueNumber}: ${issueTitle}" --body "<description>\\n\\nCloses #${issueNumber}"\`

## Quality Guidelines
- Follow existing code style and conventions
- Add error handling where appropriate
- Write tests if the project has a test framework set up
- Keep changes minimal and focused on the issue requirements
`;
}
