import { describe, it, expect } from "vitest";
import { PLAN_HEADER, getPlanHeader, getPlanFooter, getDecomposedPlanFooter } from "./plan_comment";

describe("templates/plan_comment", () => {
  describe("PLAN_HEADER", () => {
    it("should have the correct header text", () => {
      expect(PLAN_HEADER).toBe("## 🏛️ Leonidas Implementation Plan");
    });
  });

  describe("getPlanHeader", () => {
    it("should return English header by default", () => {
      expect(getPlanHeader()).toBe("## 🏛️ Leonidas Implementation Plan");
    });

    it("should return English header when language is 'en'", () => {
      expect(getPlanHeader("en")).toBe("## 🏛️ Leonidas Implementation Plan");
    });

    it("should return Korean header when language is 'ko'", () => {
      expect(getPlanHeader("ko")).toBe("## 🏛️ 레오니다스 구현 계획");
    });

    it("should return Japanese header when language is 'ja'", () => {
      expect(getPlanHeader("ja")).toBe("## 🏛️ レオニダス実装計画");
    });

    it("should return Chinese header when language is 'zh'", () => {
      expect(getPlanHeader("zh")).toBe("## 🏛️ 列奥尼达实施计划");
    });

    it("should return Spanish header when language is 'es'", () => {
      expect(getPlanHeader("es")).toBe("## 🏛️ Plan de Implementación de Leonidas");
    });
  });

  describe("getPlanFooter", () => {
    it("should return English footer by default", () => {
      const footer = getPlanFooter();
      expect(footer).toContain("To approve this plan and start implementation");
      expect(footer).toContain("`/approve`");
    });

    it("should return English footer when language is 'en'", () => {
      const footer = getPlanFooter("en");
      expect(footer).toContain("To approve this plan and start implementation");
      expect(footer).toContain("`/approve`");
    });

    it("should return Korean footer when language is 'ko'", () => {
      const footer = getPlanFooter("ko");
      expect(footer).toContain("이 계획을 승인하고 구현을 시작하려면");
      expect(footer).toContain("`/approve`");
    });

    it("should return Japanese footer when language is 'ja'", () => {
      const footer = getPlanFooter("ja");
      expect(footer).toContain("この計画を承認して実装を開始するには");
      expect(footer).toContain("`/approve`");
    });

    it("should return Chinese footer when language is 'zh'", () => {
      const footer = getPlanFooter("zh");
      expect(footer).toContain("要批准此计划并开始实施");
      expect(footer).toContain("`/approve`");
    });

    it("should return Spanish footer when language is 'es'", () => {
      const footer = getPlanFooter("es");
      expect(footer).toContain("Para aprobar este plan e iniciar la implementación");
      expect(footer).toContain("`/approve`");
    });
  });

  describe("getDecomposedPlanFooter", () => {
    it("should return English decomposed footer by default", () => {
      const footer = getDecomposedPlanFooter();
      expect(footer).toContain("This issue has been decomposed into sub-issues");
      expect(footer).toContain("`/approve`");
    });

    it("should return English decomposed footer when language is 'en'", () => {
      const footer = getDecomposedPlanFooter("en");
      expect(footer).toContain("This issue has been decomposed into sub-issues");
      expect(footer).toContain("`/approve`");
    });

    it("should return Korean decomposed footer when language is 'ko'", () => {
      const footer = getDecomposedPlanFooter("ko");
      expect(footer).toContain("이 이슈는 하위 이슈로 분해되었습니다");
      expect(footer).toContain("`/approve`");
    });

    it("should return Japanese decomposed footer when language is 'ja'", () => {
      const footer = getDecomposedPlanFooter("ja");
      expect(footer).toContain("このissueはサブissueに分解されました");
      expect(footer).toContain("`/approve`");
    });

    it("should return Chinese decomposed footer when language is 'zh'", () => {
      const footer = getDecomposedPlanFooter("zh");
      expect(footer).toContain("此问题已分解为子问题");
      expect(footer).toContain("`/approve`");
    });

    it("should return Spanish decomposed footer when language is 'es'", () => {
      const footer = getDecomposedPlanFooter("es");
      expect(footer).toContain("Este issue ha sido descompuesto en sub-issues");
      expect(footer).toContain("`/approve`");
    });
  });
});
