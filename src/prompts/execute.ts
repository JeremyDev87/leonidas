import { SubIssueMetadata } from "../types";
import { SupportedLanguage } from "../i18n";

export function buildExecutePrompt(
  issueTitle: string,
  issueBody: string,
  planComment: string,
  issueNumber: number,
  branchPrefix: string,
  baseBranch: string,
  systemPrompt: string,
  maxTurns: number,
  issueLabels: string[] = [],
  issueAuthor = "",
  subIssueMetadata?: SubIssueMetadata,
  language: SupportedLanguage = "en",
): string {
  const branchName = `${branchPrefix}${issueNumber}`;
  const reservedTurns = 5;
  const pushDeadline = maxTurns - reservedTurns;

  const prLabels = issueLabels.filter((l) => l !== "leonidas");
  const labelCmd =
    prLabels.length > 0
      ? `\n   - Add labels: \`gh pr edit --add-label "${prLabels.join(",")}"\``
      : "";
  const assigneeCmd = issueAuthor
    ? `\n   - Add assignee: \`gh pr edit --add-assignee "${issueAuthor}"\``
    : "";

  const prTitle = subIssueMetadata
    ? `#${subIssueMetadata.parent_issue_number} [${subIssueMetadata.order}/${subIssueMetadata.total}]: ${issueTitle}`
    : `#${issueNumber}: ${issueTitle}`;

  const prBodyLines = subIssueMetadata
    ? [`Part of #${subIssueMetadata.parent_issue_number}`, "", `Closes #${issueNumber}`]
    : [`Closes #${issueNumber}`];
  const prBody = prBodyLines.join("\n");

  const subIssueContext = subIssueMetadata
    ? `
## Sub-Issue Context

This is sub-issue **[${subIssueMetadata.order}/${subIssueMetadata.total}]** of parent issue #${subIssueMetadata.parent_issue_number}.
${subIssueMetadata.depends_on ? `- Dependency: #${subIssueMetadata.depends_on} should already be merged. Build on its changes.` : ""}
- Focus ONLY on the scope defined in this sub-issue.
- Do not make changes outside the scope of this sub-issue.
`
    : "";

  return `${systemPrompt}

---

You are implementing code changes based on an approved plan.

## Issue #${issueNumber}: ${issueTitle}

${issueBody}
${subIssueContext}
## Approved Plan

${planComment}

## Turn Budget

You have **${maxTurns} turns** total. Reserve the last ${reservedTurns} turns for push + PR creation.

- **Push deadline:** By turn ${pushDeadline}, you MUST have pushed your branch.
- **Strategy:** Push early and create a draft PR after completing 2-3 implementation steps.
  Then continue pushing incremental commits. Convert to ready PR when done.
- **If running low on turns:** Push whatever you have, create a draft PR, and leave a comment
  explaining what's done and what remains.

## Instructions

1. Create a new branch for this implementation:
   - Delete any existing remote branch first: \`git push origin --delete ${branchName} 2>/dev/null || true\`
   - Create and switch to the branch: \`git checkout -b ${branchName}\`

2. Follow the implementation plan step by step.
3. For each step:
   - Implement the changes described
   - Make an atomic commit with a clear message: \`step N: <description>\`
   - Verify the changes work before moving to the next step
   - Push after every 2-3 commits
4. After all steps are complete:
   - Run any relevant tests or build commands if a test framework and dependencies are available
   - Ensure all changes are committed
5. If you haven't already, create or update the pull request:
   - If no PR exists yet, create as draft:
     \`\`\`bash
     gh pr create --draft --base ${baseBranch} --title "${prTitle}" --body "$(cat <<'PRBODY'
${prBody}
PRBODY
)"
     \`\`\`${labelCmd}${assigneeCmd}
   - Continue pushing commits as you complete more work
   - When all steps complete, convert draft to ready: \`gh pr ready\`

## Important Rules
- Do NOT run \`npm install\` or install dependencies unless the plan explicitly requires adding new packages
- Do NOT run typecheck or build commands unless the project already has dependencies installed
- Focus only on implementing the changes described in the plan
- Keep changes minimal and focused on the issue requirements
- Follow existing code style and conventions
`;
}
