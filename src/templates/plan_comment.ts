export const PLAN_HEADER = '## 🏛️ Leonidas Implementation Plan';

export const PLAN_FOOTER = `---
> To approve this plan and start implementation, comment \`/approve\` on this issue.`;

export const DECOMPOSED_MARKER = "<!-- leonidas-decomposed -->";

export const DECOMPOSED_PLAN_FOOTER = `---
> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting \`/approve\` on each one.`;

export function formatPlanComment(
  summary: string,
  steps: string[],
  considerations: string,
  verification: string,
): string {
  const stepsList = steps
    .map((step, i) => `- [ ] **Step ${i + 1}:** ${step}`)
    .join('\n');

  return `${PLAN_HEADER}

### Summary
${summary}

### Implementation Steps
${stepsList}

### Considerations
${considerations}

### Verification
${verification}

${PLAN_FOOTER}
`;
}
