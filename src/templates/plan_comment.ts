export const PLAN_HEADER = '## 🏛️ Leonidas Implementation Plan';

export const PLAN_FOOTER = `---
> To approve this plan and start implementation, comment \`/approve\` on this issue.`;

export const DECOMPOSED_MARKER = "<!-- leonidas-decomposed -->";

export const DECOMPOSED_PLAN_FOOTER = `---
> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting \`/approve\` on each one.`;

export interface SubIssueSummary {
  number: number;
  title: string;
  order: number;
  total: number;
  depends_on?: number;
}

export function formatDecomposedPlanComment(
  summary: string,
  subIssues: SubIssueSummary[],
  considerations: string,
): string {
  const sorted = [...subIssues].sort((a, b) => a.order - b.order);
  const checklist = sorted
    .map((si) => {
      const dep = si.depends_on ? ` (depends on #${si.depends_on})` : "";
      return `- [ ] #${si.number} — [${si.order}/${si.total}] ${si.title}${dep}`;
    })
    .join("\n");

  return `${PLAN_HEADER}

${DECOMPOSED_MARKER}

### Summary
${summary}

### Sub-Issues
${checklist}

### Considerations
${considerations}

${DECOMPOSED_PLAN_FOOTER}
`;
}

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
