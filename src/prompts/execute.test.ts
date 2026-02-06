import { describe, it, expect } from "vitest";
import { buildExecutePrompt } from "./execute";

describe("prompts/execute", () => {
  describe("buildExecutePrompt", () => {
    const issueTitle = "Add new feature";
    const issueBody = "We need to implement feature X";
    const planComment = "## Plan\n\n- Step 1: Do something\n- Step 2: Do something else";
    const issueNumber = 42;
    const branchPrefix = "claude/issue-";
    const baseBranch = "main";
    const systemPrompt = "You are a helpful coding assistant.";
    const maxTurns = 50;

    it("should build a complete execute prompt with all sections", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain(systemPrompt);
      expect(result).toContain("You are implementing code changes based on an approved plan.");
      expect(result).toContain(`## Issue #${issueNumber}: ${issueTitle}`);
      expect(result).toContain(issueBody);
      expect(result).toContain("## Approved Plan");
      expect(result).toContain(planComment);
      expect(result).toContain("## Turn Budget");
      expect(result).toContain("## Instructions");
      expect(result).toContain("## Important Rules");
    });

    it("should generate correct branch name from prefix and issue number", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        123,
        "bot/issue-",
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain("git push origin --delete bot/issue-123");
      expect(result).toContain("git checkout -b bot/issue-123");
    });

    it("should calculate push deadline correctly", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        50,
      );

      expect(result).toContain(
        "You have **50 turns** total. Reserve the last 5 turns for push + PR creation.",
      );
      expect(result).toContain("**Push deadline:** By turn 45, you MUST have pushed your branch.");
    });

    it("should include label command when labels are provided", () => {
      const labels = ["bug", "enhancement", "leonidas"];

      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        labels,
      );

      expect(result).toContain('Add labels: `gh pr edit --add-label "bug,enhancement"`');
      expect(result).not.toContain("leonidas");
    });

    it("should filter out leonidas label from PR labels", () => {
      const labels = ["leonidas", "bug"];

      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        labels,
      );

      expect(result).toContain('Add labels: `gh pr edit --add-label "bug"`');
    });

    it("should not include label command when only leonidas label exists", () => {
      const labels = ["leonidas"];

      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        labels,
      );

      expect(result).not.toContain("Add labels:");
    });

    it("should not include label command when no labels provided", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        [],
      );

      expect(result).not.toContain("Add labels:");
    });

    it("should include assignee command when author is provided", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        [],
        "octocat",
      );

      expect(result).toContain('Add assignee: `gh pr edit --add-assignee "octocat"`');
    });

    it("should not include assignee command when author is empty string", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        [],
        "",
      );

      expect(result).not.toContain("Add assignee:");
    });

    it("should not include assignee command when author is not provided", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).not.toContain("Add assignee:");
    });

    it("should include both label and assignee commands when both provided", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
        ["bug", "enhancement"],
        "octocat",
      );

      expect(result).toContain('Add labels: `gh pr edit --add-label "bug,enhancement"`');
      expect(result).toContain('Add assignee: `gh pr edit --add-assignee "octocat"`');
    });

    it("should use correct base branch in PR command", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        "develop",
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain("gh pr create --draft --base develop");
    });

    it("should include PR creation with issue reference", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        123,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain('gh pr create --draft --base main --title "#123: Add new feature"');
      expect(result).toContain("Closes #123");
    });

    it("should include turn budget strategy instructions", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain(
        "Push early and create a draft PR after completing 2-3 implementation steps",
      );
      expect(result).toContain("Then continue pushing incremental commits");
      expect(result).toContain("If running low on turns");
    });

    it("should include step-by-step implementation instructions", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain("Follow the implementation plan step by step");
      expect(result).toContain(
        "Make an atomic commit with a clear message: `step N: <description>`",
      );
      expect(result).toContain("Push after every 2-3 commits");
      expect(result).toContain("gh pr ready");
    });

    it("should include important rules about dependencies", () => {
      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain("Do NOT run `npm install` or install dependencies");
      expect(result).toContain(
        "Do NOT run typecheck or build commands unless the project already has dependencies installed",
      );
      expect(result).toContain("Focus only on implementing the changes described in the plan");
      expect(result).toContain("Follow existing code style and conventions");
    });

    it("should start with system prompt", () => {
      const customSystemPrompt = "Custom system instructions.";

      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        customSystemPrompt,
        maxTurns,
      );

      expect(result.startsWith(customSystemPrompt)).toBe(true);
    });

    it("should handle different maxTurns values", () => {
      const result30 = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        30,
      );

      expect(result30).toContain("You have **30 turns** total");
      expect(result30).toContain("**Push deadline:** By turn 25");

      const result100 = buildExecutePrompt(
        issueTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        100,
      );

      expect(result100).toContain("You have **100 turns** total");
      expect(result100).toContain("**Push deadline:** By turn 95");
    });

    it("should handle special characters in issue title", () => {
      const specialTitle = 'Fix: Add support for "quotes" & <brackets>';

      const result = buildExecutePrompt(
        specialTitle,
        issueBody,
        planComment,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain(specialTitle);
    });

    it("should handle multiline plan comment", () => {
      const multilinePlan = `## Plan

Step 1: First thing
Step 2: Second thing
Step 3: Third thing`;

      const result = buildExecutePrompt(
        issueTitle,
        issueBody,
        multilinePlan,
        issueNumber,
        branchPrefix,
        baseBranch,
        systemPrompt,
        maxTurns,
      );

      expect(result).toContain(multilinePlan);
    });
  });
});
