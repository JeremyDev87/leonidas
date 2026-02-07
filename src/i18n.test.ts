import { describe, it, expect } from "vitest";
import { isSupportedLanguage, resolveLanguage, t, SupportedLanguage } from "./i18n";

describe("i18n", () => {
  describe("isSupportedLanguage", () => {
    it("should return true for valid language codes", () => {
      expect(isSupportedLanguage("en")).toBe(true);
      expect(isSupportedLanguage("ko")).toBe(true);
      expect(isSupportedLanguage("ja")).toBe(true);
      expect(isSupportedLanguage("zh")).toBe(true);
      expect(isSupportedLanguage("es")).toBe(true);
    });

    it("should return false for invalid language codes", () => {
      expect(isSupportedLanguage("fr")).toBe(false);
      expect(isSupportedLanguage("de")).toBe(false);
      expect(isSupportedLanguage("")).toBe(false);
      expect(isSupportedLanguage("invalid")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isSupportedLanguage(null)).toBe(false);
      expect(isSupportedLanguage(undefined)).toBe(false);
      expect(isSupportedLanguage(123)).toBe(false);
      expect(isSupportedLanguage({})).toBe(false);
      expect(isSupportedLanguage([])).toBe(false);
    });
  });

  describe("resolveLanguage", () => {
    it("should return the language code if it is supported", () => {
      expect(resolveLanguage("en")).toBe("en");
      expect(resolveLanguage("ko")).toBe("ko");
      expect(resolveLanguage("ja")).toBe("ja");
      expect(resolveLanguage("zh")).toBe("zh");
      expect(resolveLanguage("es")).toBe("es");
    });

    it("should return 'en' as fallback for invalid language codes", () => {
      expect(resolveLanguage("fr")).toBe("en");
      expect(resolveLanguage("de")).toBe("en");
      expect(resolveLanguage("")).toBe("en");
      expect(resolveLanguage("invalid")).toBe("en");
    });

    it("should return 'en' as fallback for non-string values", () => {
      expect(resolveLanguage(null)).toBe("en");
      expect(resolveLanguage(undefined)).toBe("en");
      expect(resolveLanguage(123)).toBe("en");
      expect(resolveLanguage({})).toBe("en");
      expect(resolveLanguage([])).toBe("en");
    });
  });

  describe("t", () => {
    describe("translation lookup", () => {
      it("should return English translation by default", () => {
        expect(t("plan_header")).toBe("## 🏛️ Leonidas Implementation Plan");
        expect(t("plan_footer")).toBe(
          "---\n> To approve this plan and start implementation, comment `/approve` on this issue.",
        );
        expect(t("decomposed_plan_footer")).toBe(
          "---\n> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting `/approve` on each one.",
        );
      });

      it("should return Korean translation for 'ko' language", () => {
        expect(t("plan_header", "ko")).toBe("## 🏛️ 레오니다스 구현 계획");
        expect(t("plan_footer", "ko")).toBe(
          "---\n> 이 계획을 승인하고 구현을 시작하려면 이 이슈에 `/approve`를 댓글로 작성하세요.",
        );
        expect(t("decomposed_plan_footer", "ko")).toBe(
          "---\n> 이 이슈는 하위 이슈로 분해되었습니다. 각 하위 이슈에 `/approve`를 댓글로 작성하여 개별적으로 승인하고 실행하세요.",
        );
      });

      it("should return Japanese translation for 'ja' language", () => {
        expect(t("plan_header", "ja")).toBe("## 🏛️ レオニダス実装計画");
        expect(t("plan_footer", "ja")).toBe(
          "---\n> この計画を承認して実装を開始するには、このissueに `/approve` とコメントしてください。",
        );
        expect(t("decomposed_plan_footer", "ja")).toBe(
          "---\n> このissueはサブissueに分解されました。各サブissueに `/approve` とコメントして、個別に承認して実行してください。",
        );
      });

      it("should return Chinese translation for 'zh' language", () => {
        expect(t("plan_header", "zh")).toBe("## 🏛️ 列奥尼达实施计划");
        expect(t("plan_footer", "zh")).toBe(
          "---\n> 要批准此计划并开始实施，请在此问题上评论 `/approve`。",
        );
        expect(t("decomposed_plan_footer", "zh")).toBe(
          "---\n> 此问题已分解为子问题。请在每个子问题上评论 `/approve` 以分别批准和执行。",
        );
      });

      it("should return Spanish translation for 'es' language", () => {
        expect(t("plan_header", "es")).toBe("## 🏛️ Plan de Implementación de Leonidas");
        expect(t("plan_footer", "es")).toBe(
          "---\n> Para aprobar este plan e iniciar la implementación, comenta `/approve` en este issue.",
        );
        expect(t("decomposed_plan_footer", "es")).toBe(
          "---\n> Este issue ha sido descompuesto en sub-issues. Aprueba y ejecuta cada sub-issue individualmente comentando `/approve` en cada uno.",
        );
      });

      it("should fallback to English for invalid language codes", () => {
        expect(t("plan_header", "fr" as SupportedLanguage)).toBe(
          "## 🏛️ Leonidas Implementation Plan",
        );
        expect(t("plan_footer", "de" as SupportedLanguage)).toBe(
          "---\n> To approve this plan and start implementation, comment `/approve` on this issue.",
        );
      });
    });

    describe("t() interpolation", () => {
      it("should return template unchanged when no placeholders and no args", () => {
        const result = t("plan_header", "en");
        expect(result).toBe("## 🏛️ Leonidas Implementation Plan");
      });

      it("should return template unchanged when args provided but no placeholders in template", () => {
        const result = t("plan_header", "en", 42, "test");
        expect(result).toBe("## 🏛️ Leonidas Implementation Plan");
      });

      it("should handle missing translation key", () => {
        const result = t("nonexistent_key" as any, "en");
        expect(result).toBe("[Missing translation: nonexistent_key]");
      });

      it("should handle missing translation key with args", () => {
        const result = t("nonexistent_key" as any, "en", 42);
        expect(result).toBe("[Missing translation: nonexistent_key]");
      });
    });
  });
});
