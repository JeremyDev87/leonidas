import { describe, it, expect } from "vitest";
import {
  buildCompletionComment,
  buildPartialProgressComment,
  buildFailureComment,
  buildRescuePRTitle,
  buildRescuePRBody,
} from "./post_processing";
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
      issueNumber: 42,
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
      issueNumber: 42,
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
        issueNumber: 10,
        mode: "plan",
        language: lang,
        runUrl: "https://example.com/run",
      });
      expect(planResult).toContain("https://example.com/run");

      const execResult = buildFailureComment({
        issueNumber: 10,
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
