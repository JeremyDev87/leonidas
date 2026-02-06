import {
  getPlanHeader,
  getPlanFooter,
  getDecomposedPlanFooter,
  DECOMPOSED_MARKER,
} from "../templates/plan_comment";
import { SubIssueMetadata } from "../types";
import { SupportedLanguage } from "../i18n";
import { wrapUserContent } from "../utils/sanitize";

export function buildPlanPrompt(
  issueTitle: string,
  issueBody: string,
  issueNumber: number,
  repoName: string,
  systemPrompt: string,
  label = "leonidas",
  language: SupportedLanguage = "en",
): string {
  const planHeader = getPlanHeader(language);
  const planFooter = getPlanFooter(language);
  const decomposedPlanFooter = getDecomposedPlanFooter(language);

  // Wrap user-supplied content to prevent prompt injection
  const safeTitle = wrapUserContent(issueTitle);
  const safeBody = wrapUserContent(issueBody);

  return `${systemPrompt}

---

You are analyzing a GitHub issue to create an implementation plan.

## Repository
${repoName}

## Issue #${issueNumber}: ${safeTitle}

${safeBody}

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

## Planning Methodology

Follow this 5-Phase approach to create high-quality implementation plans:

### Phase 1: Discovery
Read key files to understand the project structure and conventions:
- README.md — Project purpose, setup instructions, architecture overview
- package.json — Dependencies, scripts, tech stack
- Configuration files — Build tools (tsconfig.json, webpack.config.js), linters, test frameworks
- Source structure — Explore the main source directory (src/, lib/, etc.)

### Phase 2: Deep Analysis
Identify and analyze files related to the issue:
- Use Glob/Grep to find relevant files based on issue requirements
- Read implementations of similar features or related code
- Check dependencies and imports to understand relationships
- Identify existing patterns and conventions to follow

### Phase 3: Issue Classification
Classify the issue type to guide your planning approach:
- **Bug Fix:** Restore expected behavior (add failing test → fix → verify)
- **Feature:** Add new functionality (design interface → implement → test → integrate)
- **Refactor:** Improve structure without changing behavior (test coverage → refactor → verify)
- **Documentation:** Improve understanding (identify gaps → add/update docs → verify)

### Phase 4: Plan Generation
Create specific, actionable steps:
- Reference exact file paths and line numbers (e.g., src/utils/parser.ts:42-56)
- Name specific functions, classes, or variables to modify
- Include verification method for each step (run tests, check output, etc.)
- Keep steps atomic (one logical change per step)
- Ensure total plan is ≤7 steps

### Phase 5: Self-Review
Before posting the plan, verify it meets quality criteria:
- [ ] All steps reference specific file paths
- [ ] Each step includes verification method
- [ ] Plan has ≤7 steps total
- [ ] All acceptance criteria from issue are addressed
- [ ] Steps follow existing code conventions
- [ ] Dependencies between steps are clear

### If you decide to DECOMPOSE:

1. Split the work into 2-5 sub-issues following the Single Responsibility Principle.
2. Each sub-issue should be independently implementable and testable.
3. Create sub-issues AND link them as native GitHub sub-issues using the \`gh\` CLI with the \`${label}\` label:

\`\`\`bash
# Create sub-issue and capture the URL
SUB_URL=$(gh issue create \\
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
- [ ] Criterion 2")

# Extract sub-issue number and link as native sub-issue
SUB_NUM=\$(echo "$SUB_URL" | grep -oE '[0-9]+$')
SUB_DB_ID=$(gh api "repos/${repoName}/issues/$SUB_NUM" --jq '.id')
gh api "repos/${repoName}/issues/${issueNumber}/sub_issues" \\
  -X POST -F "sub_issue_id=$SUB_DB_ID" || true
\`\`\`

4. After creating ALL sub-issues, post a decomposed plan comment on issue #${issueNumber}:

The comment MUST start with this exact header and include the decomposed marker:

${planHeader}

${DECOMPOSED_MARKER}

### Summary
<Brief description of the decomposition approach>

### Sub-Issues
- [ ] #N — [1/T] Sub-issue title
- [ ] #N — [2/T] Sub-issue title (depends on #PREV)
...

### Considerations
<Dependencies between sub-issues, integration notes>

${decomposedPlanFooter}

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

${planHeader}

Use this exact format for the comment:

${planHeader}

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

${planFooter}

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
  language: SupportedLanguage = "en",
): string {
  const planHeader = getPlanHeader(language);
  const planFooter = getPlanFooter(language);

  // Wrap user-supplied content to prevent prompt injection
  const safeTitle = wrapUserContent(issueTitle);
  const safeBody = wrapUserContent(issueBody);

  return `${systemPrompt}

---

You are analyzing a sub-issue to create an implementation plan.

## Repository
${repoName}

## Sub-Issue #${issueNumber}: ${safeTitle}
**[${metadata.order}/${metadata.total}] of parent issue #${metadata.parent_issue_number}**

${safeBody}

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

${planHeader}

Use this exact format for the comment:

${planHeader}

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

${planFooter}

3. Post the plan using: \`gh issue comment ${issueNumber} --body "<plan>"\`
`;
}
