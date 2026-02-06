import { describe, it, expect } from "vitest";
import { PLAN_HEADER, PLAN_FOOTER, formatPlanComment } from "./plan_comment";

describe("templates/plan_comment", () => {
  describe("PLAN_HEADER", () => {
    it("should have the correct header text", () => {
      expect(PLAN_HEADER).toBe("## 🏛️ Leonidas Implementation Plan");
    });
  });

  describe("PLAN_FOOTER", () => {
    it("should have the correct footer text with approval instruction", () => {
      expect(PLAN_FOOTER).toContain("To approve this plan and start implementation");
      expect(PLAN_FOOTER).toContain("`/approve`");
    });
  });

  describe("formatPlanComment", () => {
    it("should format a complete plan comment with all sections", () => {
      const summary = "Implement user authentication";
      const steps = ["Add login form", "Create auth middleware", "Add tests"];
      const considerations = "Consider rate limiting and security";
      const verification = "Run tests and verify login works";

      const result = formatPlanComment(summary, steps, considerations, verification);

      expect(result).toContain(PLAN_HEADER);
      expect(result).toContain("### Summary");
      expect(result).toContain(summary);
      expect(result).toContain("### Implementation Steps");
      expect(result).toContain("### Considerations");
      expect(result).toContain(considerations);
      expect(result).toContain("### Verification");
      expect(result).toContain(verification);
      expect(result).toContain(PLAN_FOOTER);
    });

    it("should number steps starting from 1", () => {
      const steps = ["First step", "Second step", "Third step"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:** First step");
      expect(result).toContain("- [ ] **Step 2:** Second step");
      expect(result).toContain("- [ ] **Step 3:** Third step");
    });

    it("should format steps as unchecked checkboxes", () => {
      const steps = ["Add feature"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:**");
      expect(result).not.toContain("- [x]");
    });

    it("should handle single step", () => {
      const steps = ["Only one step"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:** Only one step");
      expect(result).not.toContain("Step 2:");
    });

    it("should handle multiple steps", () => {
      const steps = ["Step A", "Step B", "Step C", "Step D", "Step E"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:** Step A");
      expect(result).toContain("- [ ] **Step 2:** Step B");
      expect(result).toContain("- [ ] **Step 3:** Step C");
      expect(result).toContain("- [ ] **Step 4:** Step D");
      expect(result).toContain("- [ ] **Step 5:** Step E");
    });

    it("should format steps with newlines between them", () => {
      const steps = ["First", "Second"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:** First\n- [ ] **Step 2:** Second");
    });

    it("should handle empty steps array", () => {
      const steps: string[] = [];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("### Implementation Steps");
      expect(result).not.toContain("Step 1:");
    });

    it("should handle multiline summary", () => {
      const summary = "Line 1\nLine 2\nLine 3";

      const result = formatPlanComment(summary, ["Step"], "Considerations", "Verification");

      expect(result).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should handle multiline considerations", () => {
      const considerations = "Point 1\nPoint 2\nPoint 3";

      const result = formatPlanComment("Summary", ["Step"], considerations, "Verification");

      expect(result).toContain("Point 1\nPoint 2\nPoint 3");
    });

    it("should handle multiline verification", () => {
      const verification = "Step 1: Check this\nStep 2: Check that";

      const result = formatPlanComment("Summary", ["Step"], "Considerations", verification);

      expect(result).toContain("Step 1: Check this\nStep 2: Check that");
    });

    it("should maintain proper section order", () => {
      const result = formatPlanComment("Sum", ["Step"], "Cons", "Ver");

      const headerIndex = result.indexOf(PLAN_HEADER);
      const summaryIndex = result.indexOf("### Summary");
      const stepsIndex = result.indexOf("### Implementation Steps");
      const considerationsIndex = result.indexOf("### Considerations");
      const verificationIndex = result.indexOf("### Verification");
      const footerIndex = result.indexOf(PLAN_FOOTER);

      expect(headerIndex).toBeLessThan(summaryIndex);
      expect(summaryIndex).toBeLessThan(stepsIndex);
      expect(stepsIndex).toBeLessThan(considerationsIndex);
      expect(considerationsIndex).toBeLessThan(verificationIndex);
      expect(verificationIndex).toBeLessThan(footerIndex);
    });

    it("should handle steps with special markdown characters", () => {
      const steps = ["Add `code` blocks", "Handle **bold** text", "Process _italics_"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain("- [ ] **Step 1:** Add `code` blocks");
      expect(result).toContain("- [ ] **Step 2:** Handle **bold** text");
      expect(result).toContain("- [ ] **Step 3:** Process _italics_");
    });

    it("should preserve empty strings in sections", () => {
      const result = formatPlanComment("", ["Step"], "", "");

      expect(result).toContain("### Summary\n\n");
      expect(result).toContain("### Considerations\n\n");
      expect(result).toContain("### Verification\n\n");
    });

    it("should create valid markdown structure", () => {
      const result = formatPlanComment("Summary", ["Step one"], "Consider this", "Verify that");

      expect(result.startsWith(PLAN_HEADER)).toBe(true);
      expect(result.endsWith(PLAN_FOOTER + "\n")).toBe(true);
      expect(result).toContain("\n\n");
    });

    it("should handle long step descriptions", () => {
      const longStep =
        "This is a very long step description that contains multiple sentences and explains in detail what needs to be done in this particular step of the implementation plan.";
      const steps = [longStep];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      expect(result).toContain(`- [ ] **Step 1:** ${longStep}`);
    });

    it("should format exactly 7 steps correctly", () => {
      const steps = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7"];

      const result = formatPlanComment("Summary", steps, "Considerations", "Verification");

      steps.forEach((step, index) => {
        expect(result).toContain(`- [ ] **Step ${index + 1}:** ${step}`);
      });
    });
  });
});
