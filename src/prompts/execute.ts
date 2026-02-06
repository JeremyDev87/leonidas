export function buildExecutePrompt(
  issueTitle: string,
  issueBody: string,
  planComment: string,
  issueNumber: number,
  branchPrefix: string,
  baseBranch: string,
  systemPrompt: string,
): string {
  const branchName = `${branchPrefix}${issueNumber}`;

  return `${systemPrompt}

---

You are implementing code changes based on an approved plan.

## Issue #${issueNumber}: ${issueTitle}

${issueBody}

## Approved Plan

${planComment}

## Instructions

1. Create a new branch for this implementation:
   - Delete any existing remote branch first: \`git push origin --delete ${branchName} 2>/dev/null || true\`
   - Create and switch to the branch: \`git checkout -b ${branchName}\`

2. Follow the implementation plan step by step.
3. For each step:
   - Implement the changes described
   - Make an atomic commit with a clear message: \`step N: <description>\`
   - Verify the changes work before moving to the next step
4. After all steps are complete:
   - Run any relevant tests or build commands if a test framework and dependencies are available
   - Ensure all changes are committed
5. Push the branch and create a pull request:
   - Push: \`git push origin ${branchName}\`
   - Create PR: \`gh pr create --base ${baseBranch} --title "#${issueNumber}: ${issueTitle}" --body "<summary>\\n\\nCloses #${issueNumber}"\`

## Important Rules
- Do NOT run \`npm install\` or install dependencies unless the plan explicitly requires adding new packages
- Do NOT run typecheck or build commands unless the project already has dependencies installed
- Focus only on implementing the changes described in the plan
- Keep changes minimal and focused on the issue requirements
- Follow existing code style and conventions
`;
}
