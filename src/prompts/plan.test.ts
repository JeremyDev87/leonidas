import { describe, it, expect } from "vitest";
import { buildPlanPrompt } from "./plan";
import { PLAN_HEADER, PLAN_FOOTER } from "../templates/plan_comment";

describe("prompts/plan", () => {
  describe("buildPlanPrompt", () => {
    const issueTitle = "Add new feature";
    const issueBody = "We need to implement feature X with Y functionality";
    const issueNumber = 42;
    const repoName = "owner/repo";
    const systemPrompt = "You are a helpful coding assistant.";

    it("should build a complete plan prompt with all sections", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain(systemPrompt);
      expect(result).toContain(
        "You are analyzing a GitHub issue to create an implementation plan.",
      );
      expect(result).toContain(`## Repository\n${repoName}`);
      expect(result).toContain(`## Issue #${issueNumber}: ${issueTitle}`);
      expect(result).toContain(issueBody);
      expect(result).toContain("## Scope Constraints");
      expect(result).toContain("**Maximum 7 implementation steps.**");
      expect(result).toContain("## Instructions");
      expect(result).toContain(PLAN_HEADER);
      expect(result).toContain(PLAN_FOOTER);
      expect(result).toContain(`gh issue comment ${issueNumber} --body "<plan>"`);
    });

    it("should include issue metadata correctly", () => {
      const result = buildPlanPrompt(
        "Fix bug in login",
        "Users cannot log in when using special characters",
        123,
        "myorg/myrepo",
        systemPrompt,
      );

      expect(result).toContain("## Issue #123: Fix bug in login");
      expect(result).toContain("Users cannot log in when using special characters");
      expect(result).toContain("myorg/myrepo");
    });

    it("should include PLAN_HEADER and PLAN_FOOTER", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      const headerCount = (
        result.match(new RegExp(PLAN_HEADER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []
      ).length;
      expect(headerCount).toBeGreaterThanOrEqual(2);
      expect(result).toContain(PLAN_FOOTER);
    });

    it("should include format template for plan comment", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain("### Summary");
      expect(result).toContain("### Implementation Steps");
      expect(result).toContain("### Considerations");
      expect(result).toContain("### Verification");
      expect(result).toContain("- [ ] Step 1:");
      expect(result).toContain("- [ ] Step 2:");
    });

    it("should include scope constraints", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain("Maximum 7 implementation steps");
      expect(result).toContain("Phase 1 covers the core changes (up to 7 steps)");
      expect(result).toContain("Each step should be completable in 3-5 turns");
      expect(result).toContain("Prefer fewer, larger steps over many small ones");
    });

    it("should include analysis instructions", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain("Analyze the repository structure");
      expect(result).toContain("Read key files");
      expect(result).toContain("Understand the project architecture");
      expect(result).toContain("Identify files that will need to be created or modified");
    });

    it("should include comment posting instruction with correct issue number", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, 999, repoName, systemPrompt);

      expect(result).toContain('gh issue comment 999 --body "<plan>"');
    });

    it("should handle multiline issue body", () => {
      const multilineBody = `Line 1
Line 2
Line 3`;

      const result = buildPlanPrompt(
        issueTitle,
        multilineBody,
        issueNumber,
        repoName,
        systemPrompt,
      );

      expect(result).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should handle empty issue body", () => {
      const result = buildPlanPrompt(issueTitle, "", issueNumber, repoName, systemPrompt);

      expect(result).toContain(`## Issue #${issueNumber}: ${issueTitle}`);
      expect(result).not.toContain("undefined");
    });

    it("should handle special characters in issue title", () => {
      const specialTitle = 'Fix: Add support for "quotes" & <brackets>';

      const result = buildPlanPrompt(specialTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain(specialTitle);
    });

    it("should start with system prompt", () => {
      const customSystemPrompt = "Custom system instructions here.";

      const result = buildPlanPrompt(
        issueTitle,
        issueBody,
        issueNumber,
        repoName,
        customSystemPrompt,
      );

      expect(result.startsWith(customSystemPrompt)).toBe(true);
    });

    it("should separate system prompt from plan instructions with separator", () => {
      const result = buildPlanPrompt(issueTitle, issueBody, issueNumber, repoName, systemPrompt);

      expect(result).toContain(`${systemPrompt}\n\n---\n\nYou are analyzing a GitHub issue`);
    });
  });
});
