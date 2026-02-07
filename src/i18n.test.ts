import { describe, it, expect } from "vitest";
import {
  isSupportedLanguage,
  resolveLanguage,
  t,
  SupportedLanguage,
  TranslationKey,
  LANGUAGE_DISPLAY_NAMES,
} from "./i18n";

describe("i18n", () => {
  describe("LANGUAGE_DISPLAY_NAMES", () => {
    it("should contain display names for all supported languages", () => {
      expect(LANGUAGE_DISPLAY_NAMES.en).toBe("English");
      expect(LANGUAGE_DISPLAY_NAMES.ko).toBe("Korean");
      expect(LANGUAGE_DISPLAY_NAMES.ja).toBe("Japanese");
      expect(LANGUAGE_DISPLAY_NAMES.zh).toBe("Chinese");
      expect(LANGUAGE_DISPLAY_NAMES.es).toBe("Spanish");
      expect(LANGUAGE_DISPLAY_NAMES.de).toBe("German");
      expect(LANGUAGE_DISPLAY_NAMES.fr).toBe("French");
      expect(LANGUAGE_DISPLAY_NAMES.pt).toBe("Portuguese");
    });

    it("should have exactly 8 language entries", () => {
      expect(Object.keys(LANGUAGE_DISPLAY_NAMES)).toHaveLength(8);
    });
  });

  describe("isSupportedLanguage", () => {
    it("should return true for valid language codes", () => {
      expect(isSupportedLanguage("en")).toBe(true);
      expect(isSupportedLanguage("ko")).toBe(true);
      expect(isSupportedLanguage("ja")).toBe(true);
      expect(isSupportedLanguage("zh")).toBe(true);
      expect(isSupportedLanguage("es")).toBe(true);
      expect(isSupportedLanguage("de")).toBe(true);
      expect(isSupportedLanguage("fr")).toBe(true);
      expect(isSupportedLanguage("pt")).toBe(true);
    });

    it("should return false for invalid language codes", () => {
      expect(isSupportedLanguage("it")).toBe(false);
      expect(isSupportedLanguage("ru")).toBe(false);
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
      expect(resolveLanguage("de")).toBe("de");
      expect(resolveLanguage("fr")).toBe("fr");
      expect(resolveLanguage("pt")).toBe("pt");
    });

    it("should return 'en' as fallback for invalid language codes", () => {
      expect(resolveLanguage("it")).toBe("en");
      expect(resolveLanguage("ru")).toBe("en");
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

      it("should return German translation for 'de' language", () => {
        expect(t("plan_header", "de")).toBe("## 🏛️ Leonidas Implementierungsplan");
        expect(t("plan_footer", "de")).toBe(
          "---\n> Um diesen Plan zu genehmigen und mit der Implementierung zu beginnen, kommentieren Sie `/approve` in diesem Issue.",
        );
        expect(t("decomposed_plan_footer", "de")).toBe(
          "---\n> Dieses Issue wurde in Unter-Issues aufgeteilt. Genehmigen und führen Sie jedes Unter-Issue einzeln aus, indem Sie `/approve` in jedem kommentieren.",
        );
      });

      it("should return French translation for 'fr' language", () => {
        expect(t("plan_header", "fr")).toBe("## 🏛️ Plan d'Implémentation Leonidas");
        expect(t("plan_footer", "fr")).toBe(
          "---\n> Pour approuver ce plan et commencer l'implémentation, commentez `/approve` sur ce ticket.",
        );
        expect(t("decomposed_plan_footer", "fr")).toBe(
          "---\n> Ce ticket a été décomposé en sous-tickets. Approuvez et exécutez chaque sous-ticket individuellement en commentant `/approve` sur chacun.",
        );
      });

      it("should return Portuguese translation for 'pt' language", () => {
        expect(t("plan_header", "pt")).toBe("## 🏛️ Plano de Implementação Leonidas");
        expect(t("plan_footer", "pt")).toBe(
          "---\n> Para aprovar este plano e iniciar a implementação, comente `/approve` neste issue.",
        );
        expect(t("decomposed_plan_footer", "pt")).toBe(
          "---\n> Este issue foi decomposto em sub-issues. Aprove e execute cada sub-issue individualmente comentando `/approve` em cada um.",
        );
      });

      it("should fallback to English for invalid language codes", () => {
        expect(t("plan_header", "it" as SupportedLanguage)).toBe(
          "## 🏛️ Leonidas Implementation Plan",
        );
        expect(t("plan_footer", "ru" as SupportedLanguage)).toBe(
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

describe("post-processing translation keys", () => {
  const languages: SupportedLanguage[] = ["en", "ko", "ja", "zh", "es", "de", "fr", "pt"];
  const postProcessingKeys: TranslationKey[] = [
    "completion_with_pr",
    "completion_no_pr",
    "partial_header",
    "partial_pr_exists",
    "partial_draft_created",
    "partial_pr_body_header",
    "partial_pr_body",
    "failure_header",
    "failure_plan_body",
    "failure_execute_body",
  ];

  it("should have translations for all post-processing keys in all languages", () => {
    for (const lang of languages) {
      for (const key of postProcessingKeys) {
        const result = t(key, lang);
        expect(result).not.toBe(`[Missing translation: ${key}]`);
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });

  it("should interpolate completion_with_pr correctly", () => {
    expect(t("completion_with_pr", "en", 42, "123")).toContain("#42");
    expect(t("completion_with_pr", "en", 42, "123")).toContain("#123");
  });

  it("should interpolate completion_no_pr correctly", () => {
    const result = t("completion_no_pr", "en", 42, "https://example.com/run");
    expect(result).toContain("#42");
    expect(result).toContain("https://example.com/run");
  });

  it("should interpolate partial_pr_exists correctly", () => {
    const result = t("partial_pr_exists", "en", "99", "https://example.com/run");
    expect(result).toContain("#99");
    expect(result).toContain("https://example.com/run");
  });

  it("should interpolate partial_draft_created correctly", () => {
    const result = t(
      "partial_draft_created",
      "en",
      "https://github.com/pr/1",
      "https://example.com/run",
    );
    expect(result).toContain("https://github.com/pr/1");
    expect(result).toContain("https://example.com/run");
  });

  it("should interpolate partial_pr_body correctly", () => {
    const result = t("partial_pr_body", "en", "https://example.com/run", 42);
    expect(result).toContain("https://example.com/run");
    expect(result).toContain("#42");
  });

  it("should interpolate failure_plan_body correctly", () => {
    const result = t("failure_plan_body", "en", "https://example.com/run");
    expect(result).toContain("https://example.com/run");
  });

  it("should interpolate failure_execute_body correctly", () => {
    const result = t("failure_execute_body", "en", "https://example.com/run");
    expect(result).toContain("https://example.com/run");
  });
});
