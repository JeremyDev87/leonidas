import { PLAN_HEADER, PLAN_FOOTER } from "../templates/plan_comment";

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

2. Create a detailed implementation plan and post it as a comment on issue #${issueNumber}.

**IMPORTANT:** The comment MUST start with this exact header:

${PLAN_HEADER}

Use this exact format for the comment:

${PLAN_HEADER}

### Summary
<Brief description of the approach>

### Implementation Steps
- [ ] Step 1: <description>
- [ ] Step 2: <description>
...

### Considerations
<Edge cases, dependencies, testing notes>

### Verification
<How to verify the implementation>

${PLAN_FOOTER}

3. Post the plan using: \`gh issue comment ${issueNumber} --body "<plan>"\`
`;
}
