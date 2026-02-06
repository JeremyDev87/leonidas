export function buildPlanPrompt(
  issueTitle: string,
  issueBody: string,
  issueNumber: number,
  repoName: string,
  systemPrompt: string,
): string {
  return `${systemPrompt}

---

You are analyzing a GitHub issue to create an implementation plan.

## Repository
${repoName}

## Issue #${issueNumber}: ${issueTitle}

${issueBody}

## Instructions

1. Analyze the repository structure to understand the codebase:
   - Read key files (README, package.json, tsconfig.json, etc.)
   - Understand the project architecture and conventions
   - Identify files that will need to be created or modified

2. Create a detailed implementation plan in the following format:

### Summary
A brief description of what needs to be done and the overall approach.

### Implementation Steps
- [ ] Step 1: Description of the first task
- [ ] Step 2: Description of the second task
- [ ] ...

### Considerations
Any important notes about edge cases, dependencies, testing, or potential issues.

### Verification
How to verify the implementation is correct (commands to run, behavior to check).

3. Post the plan as a comment on issue #${issueNumber} using:
   \`gh issue comment ${issueNumber} --body "<your plan>"\`

4. End the plan comment with:
   ---
   > To approve this plan and start implementation, comment \`/approve\` on this issue.
`;
}
