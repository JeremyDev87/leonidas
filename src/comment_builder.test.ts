import { describe, it, expect } from "vitest";
import {
  buildCompletionComment,
  buildPartialProgressComment,
  buildFailureComment,
  buildRescuePRTitle,
  buildRescuePRBody,
  extractSubIssueNumbers,
  extractParentIssueNumber,
} from "./comment_builder";
import { SupportedLanguage } from "./i18n";

const ALL_LANGUAGES: SupportedLanguage[] = ["en", "ko", "ja", "zh", "es"];

describe("buildCompletionComment", () => {
  it("returns PR link message when prNumber provided", () => {
    const result = buildCompletionComment({
      issueNumber: 42,
      prNumber: "99",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("#42");
    expect(result).toContain("#99");
    expect(result).toContain("✅");
  });

  it("returns warning message when no prNumber", () => {
    const result = buildCompletionComment({
      issueNumber: 42,
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("#42");
    expect(result).toContain("https://example.com/run");
    expect(result).toContain("⚠️");
  });

  it("works for all 5 languages", () => {
    for (const lang of ALL_LANGUAGES) {
      const withPR = buildCompletionComment({
        issueNumber: 10,
        prNumber: "20",
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(withPR).toContain("#10");
      expect(withPR).toContain("#20");

      const noPR = buildCompletionComment({
        issueNumber: 10,
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(noPR).toContain("#10");
      expect(noPR).toContain("https://example.com/run");
    }
  });
});

describe("buildPartialProgressComment", () => {
  it("returns PR exists message when existingPR provided", () => {
    const result = buildPartialProgressComment({
      issueNumber: 42,
      existingPR: "99",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("Partial Progress");
    expect(result).toContain("#99");
    expect(result).toContain("https://example.com/run");
  });

  it("returns draft created message when draftPRUrl provided", () => {
    const result = buildPartialProgressComment({
      issueNumber: 42,
      draftPRUrl: "https://github.com/org/repo/pull/99",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("Partial Progress");
    expect(result).toContain("https://github.com/org/repo/pull/99");
    expect(result).toContain("https://example.com/run");
  });

  it("returns header only when no PR info provided", () => {
    const result = buildPartialProgressComment({
      issueNumber: 42,
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toBe("## ⚠️ Leonidas Partial Progress");
  });

  it("works for all 5 languages", () => {
    for (const lang of ALL_LANGUAGES) {
      const result = buildPartialProgressComment({
        issueNumber: 10,
        existingPR: "20",
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(result).toContain("#20");
      expect(result).toContain("https://example.com/run");
    }
  });
});

describe("buildFailureComment", () => {
  it("returns plan failure message for plan mode", () => {
    const result = buildFailureComment({
      mode: "plan",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("Failed");
    expect(result).toContain("plan encountered an error");
    expect(result).toContain("https://example.com/run");
    expect(result).toContain("leonidas");
  });

  it("returns execute failure message for execute mode", () => {
    const result = buildFailureComment({
      mode: "execute",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("Failed");
    expect(result).toContain("execution encountered an error");
    expect(result).toContain("https://example.com/run");
    expect(result).toContain("/approve");
  });

  it("works for all 5 languages", () => {
    for (const lang of ALL_LANGUAGES) {
      const planResult = buildFailureComment({
        mode: "plan",
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(planResult).toContain("https://example.com/run");

      const execResult = buildFailureComment({
        mode: "execute",
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(execResult).toContain("https://example.com/run");
    }
  });
});

describe("buildRescuePRTitle", () => {
  it("includes parent number when parentNumber provided", () => {
    const result = buildRescuePRTitle({
      issueNumber: 42,
      issueTitle: "Add auth feature",
      parentNumber: 10,
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toBe("#10 Add auth feature [partial]");
  });

  it("uses issue number when no parentNumber", () => {
    const result = buildRescuePRTitle({
      issueNumber: 42,
      issueTitle: "Add auth feature",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toBe("#42: Add auth feature [partial]");
  });
});

describe("buildRescuePRBody", () => {
  it("includes parent reference when parentNumber provided", () => {
    const result = buildRescuePRBody({
      issueNumber: 42,
      issueTitle: "Add auth",
      parentNumber: 10,
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).toContain("Part of #10");
    expect(result).toContain("Partial Implementation");
    expect(result).toContain("Closes #42");
    expect(result).toContain("https://example.com/run");
  });

  it("omits parent reference when no parentNumber", () => {
    const result = buildRescuePRBody({
      issueNumber: 42,
      issueTitle: "Add auth",
      language: "en",
      runUrl: "https://example.com/run",
    });
    expect(result).not.toContain("Part of");
    expect(result).toContain("Partial Implementation");
    expect(result).toContain("Closes #42");
  });

  it("works for all 5 languages", () => {
    for (const lang of ALL_LANGUAGES) {
      const result = buildRescuePRBody({
        issueNumber: 42,
        issueTitle: "Auth",
        parentNumber: 10,
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(result).toContain("Part of #10");
      expect(result).toContain("Closes #42");
      expect(result).toContain("https://example.com/run");
    }
  });
});

describe("extractSubIssueNumbers", () => {
  it("extracts issue numbers from checklist format", () => {
    const body = "- [ ] #36 — Implement auth\n- [x] #37 — Add tests\n- [ ] #38 — Deploy";
    expect(extractSubIssueNumbers(body)).toEqual([36, 37, 38]);
  });

  it("returns empty array when no checklist items found", () => {
    expect(extractSubIssueNumbers("Some regular text without checklist")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractSubIssueNumbers("")).toEqual([]);
  });

  it("handles mixed checked and unchecked items", () => {
    const body = "- [x] #10 — Done\n- [ ] #20 — Pending";
    expect(extractSubIssueNumbers(body)).toEqual([10, 20]);
  });

  it("ignores non-checklist issue references", () => {
    const body = "See #42 for details\n- [ ] #36 — Task";
    expect(extractSubIssueNumbers(body)).toEqual([36]);
  });
});

describe("extractParentIssueNumber", () => {
  it("extracts parent number from leonidas metadata comment", () => {
    const body = "<!-- leonidas-parent: #170 -->\n<!-- leonidas-order: 1/4 -->\n\nContent";
    expect(extractParentIssueNumber(body)).toBe(170);
  });

  it("returns undefined when no parent metadata", () => {
    expect(extractParentIssueNumber("Just a regular issue body")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(extractParentIssueNumber("")).toBeUndefined();
  });

  it("handles extra whitespace in metadata comment", () => {
    const body = "<!--   leonidas-parent:   #42   -->";
    expect(extractParentIssueNumber(body)).toBe(42);
  });

  it("extracts first parent number when multiple exist", () => {
    const body = "<!-- leonidas-parent: #100 -->\n<!-- leonidas-parent: #200 -->";
    expect(extractParentIssueNumber(body)).toBe(100);
  });
});
