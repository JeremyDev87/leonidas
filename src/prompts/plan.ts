import { PLAN_HEADER, PLAN_FOOTER, DECOMPOSED_MARKER, DECOMPOSED_PLAN_FOOTER } from "../templates/plan_comment";
import { SubIssueMetadata } from "../types";

export function buildPlanPrompt(
  issueTitle: string,
  issueBody: string,
  issueNumber: number,
  repoName: string,
  systemPrompt: string,
  label: string = "leonidas",
): string {
  return `${systemPrompt}

---

You are analyzing a GitHub issue to create an implementation plan.

## Repository
${repoName}

## Issue #${issueNumber}: ${issueTitle}

${issueBody}

## Complexity Assessment

Before creating a plan, assess whether this issue can be completed within a single execution cycle (max 7 steps, each 3-5 turns).

**Decompose into sub-issues if ANY of the following are true:**
- The issue clearly requires more than 7 implementation steps
- The issue touches 4+ unrelated areas of the codebase
- Multiple independent features or components need to be built
- The estimated total work exceeds 35 turns (7 steps x 5 turns)

**Keep as a single plan if:**
- The issue can be completed in 7 or fewer steps
- The changes are focused and related
- Total estimated work is under 35 turns

### If you decide to DECOMPOSE:

1. Split the work into 2-5 sub-issues following the Single Responsibility Principle.
2. Each sub-issue should be independently implementable and testable.
3. Create sub-issues using the \`gh\` CLI with the \`${label}\` label:

\`\`\`bash
gh issue create \\
  --label "${label}" \\
  --title "[1/N] Sub-issue title" \\
  --body "<!-- leonidas-parent: #${issueNumber} -->
<!-- leonidas-order: 1/N -->
<!-- leonidas-depends: #PREV_ISSUE (if applicable) -->

## Context
Part of #${issueNumber}: ${issueTitle}

## Task
<What this sub-issue should accomplish>

## Scope
<Specific files and changes>

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2"
\`\`\`

4. After creating ALL sub-issues, post a decomposed plan comment on issue #${issueNumber}:

The comment MUST start with this exact header and include the decomposed marker:

${PLAN_HEADER}

${DECOMPOSED_MARKER}

### Summary
<Brief description of the decomposition approach>

### Sub-Issues
- [ ] #N — [1/T] Sub-issue title
- [ ] #N — [2/T] Sub-issue title (depends on #PREV)
...

### Considerations
<Dependencies between sub-issues, integration notes>

${DECOMPOSED_PLAN_FOOTER}

### If you decide NOT to decompose:

Follow the standard plan format below.

## Scope Constraints

- **Maximum 7 implementation steps.** If the issue requires more, split into phases:
  - Phase 1 covers the core changes (up to 7 steps)
  - Note remaining work as "Future Phases" in the Considerations section
- Each step should be completable in 3-5 turns of Claude Code execution.
- Prefer fewer, larger steps over many small ones.

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

export function buildSubIssuePlanPrompt(
  issueTitle: string,
  issueBody: string,
  issueNumber: number,
  repoName: string,
  systemPrompt: string,
  metadata: SubIssueMetadata,
): string {
  return `${systemPrompt}

---

You are analyzing a sub-issue to create an implementation plan.

## Repository
${repoName}

## Sub-Issue #${issueNumber}: ${issueTitle}
**[${metadata.order}/${metadata.total}] of parent issue #${metadata.parent_issue_number}**

${issueBody}

## Sub-Issue Constraints

- This is a sub-issue that was decomposed from a larger parent issue.
- **DO NOT decompose this issue further.** Create a standard implementation plan.
- Focus ONLY on the scope defined in this sub-issue.
- Maximum 7 implementation steps.
- Each step should be completable in 3-5 turns of Claude Code execution.
${metadata.depends_on ? `- This sub-issue depends on #${metadata.depends_on} which should already be merged.` : ""}

## Instructions

1. Analyze the repository structure to understand the codebase:
   - Read key files relevant to this sub-issue's scope
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
