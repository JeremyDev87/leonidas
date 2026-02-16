/**
 * Internationalization (i18n) module for Leonidas
 * Supports multiple languages with translation keys and string interpolation
 */

/**
 * Supported languages for the Leonidas system (single source of truth)
 */
const SUPPORTED_LANGUAGES = ["en", "ko", "ja", "zh", "es", "de", "fr", "pt"] as const;

/**
 * Supported language type derived from the language array
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Display names for supported languages
 */
export const LANGUAGE_DISPLAY_NAMES = {
  en: "English",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  de: "German",
  fr: "French",
  pt: "Portuguese",
} as const satisfies Record<SupportedLanguage, string>;

/**
 * Type guard to check if a string is a supported language code
 * @param lang - The language code to check
 * @returns true if the language is supported, false otherwise
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * Resolves a language code to a supported language, with fallback to English
 * @param lang - The language code to resolve
 * @returns A valid SupportedLanguage, defaulting to "en" if invalid
 */
export function resolveLanguage(lang: unknown): SupportedLanguage {
  return isSupportedLanguage(lang) ? lang : "en";
}

/**
 * Translation keys used throughout the Leonidas system
 */
export type TranslationKey =
  | "plan_header"
  | "plan_footer"
  | "decomposed_plan_footer"
  | "completion_with_pr"
  | "completion_no_pr"
  | "partial_header"
  | "partial_pr_exists"
  | "partial_draft_created"
  | "partial_pr_body_header"
  | "partial_pr_body"
  | "failure_header"
  | "failure_plan_body"
  | "failure_execute_body"
  | "starting_implementation";

/**
 * Translation map containing all localized strings for supported languages
 */
const translations: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  en: {
    plan_header: "## 🏛️ Leonidas Implementation Plan",
    plan_footer:
      "---\n> To approve this plan and start implementation, comment `/approve` on this issue.",
    decomposed_plan_footer:
      "---\n> This issue has been decomposed into sub-issues. Approve and execute each sub-issue individually by commenting `/approve` on each one.",
    completion_with_pr:
      "✅ **Leonidas** has completed the implementation for issue #%d. Check pull request #%s for details.",
    completion_no_pr:
      "⚠️ **Leonidas** execution completed but failed to create a pull request for issue #%d. The branch push may have failed.\n\n**Workflow run:** [View logs](%s)\n\n**To retry:** Comment `/approve` again.",
    partial_header: "## ⚠️ Leonidas Partial Progress",
    partial_pr_exists:
      "Implementation was interrupted (likely hit max turns), but a PR exists.\n\n**Pull Request:** #%s\n**Status:** Partial implementation — review the PR for completed work.\n**Workflow run:** [View logs](%s)\n\n**To continue:** Comment `/approve` again to retry from a clean branch, or manually complete the PR.",
    partial_draft_created:
      "Implementation was interrupted, but a draft PR was created to preserve progress.\n\n**Draft PR:** %s\n**Workflow run:** [View logs](%s)\n\n**To continue:** Comment `/approve` again to retry, or manually complete the draft PR.",
    partial_pr_body_header: "## Partial Implementation",
    partial_pr_body:
      "This PR was auto-created by Leonidas to preserve partial progress after the execution was interrupted (likely hit max turns).\n\n**Status:** Incomplete — review and continue manually or retry.\n**Workflow run:** [View logs](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas Failed",
    failure_plan_body:
      "The automated plan encountered an error.\n\n**Workflow run:** [View logs](%s)\n\n**To retry:** Remove the `leonidas` label and re-add it.",
    failure_execute_body:
      "The automated execution encountered an error.\n\n**Workflow run:** [View logs](%s)\n\n**To retry:** Comment `/approve` again on this issue.",
    starting_implementation: "⚡ **Leonidas** is starting implementation for issue #%d...",
  },
  ko: {
    plan_header: "## 🏛️ 레오니다스 구현 계획",
    plan_footer:
      "---\n> 이 계획을 승인하고 구현을 시작하려면 이 이슈에 `/approve`를 댓글로 작성하세요.",
    decomposed_plan_footer:
      "---\n> 이 이슈는 하위 이슈로 분해되었습니다. 각 하위 이슈에 `/approve`를 댓글로 작성하여 개별적으로 승인하고 실행하세요.",
    completion_with_pr:
      "✅ **레오니다스**가 이슈 #%d에 대한 구현을 완료했습니다. 자세한 내용은 풀 리퀘스트 #%s을 확인하세요.",
    completion_no_pr:
      "⚠️ **레오니다스** 실행이 완료되었지만 이슈 #%d에 대한 풀 리퀘스트를 생성하지 못했습니다. 브랜치 push에 실패했을 수 있습니다.\n\n**워크플로 실행:** [로그 보기](%s)\n\n**재시도하려면:** `/approve`를 다시 댓글로 다세요.",
    partial_header: "## ⚠️ 레오니다스 부분 진행",
    partial_pr_exists:
      "구현이 중단되었습니다 (최대 턴 수에 도달했을 가능성이 있음). 하지만 PR이 존재합니다.\n\n**풀 리퀘스트:** #%s\n**상태:** 부분 구현 — 완료된 작업을 확인하려면 PR을 검토하세요.\n**워크플로 실행:** [로그 보기](%s)\n\n**계속하려면:** 깨끗한 브랜치에서 다시 시도하려면 `/approve`를 다시 댓글로 달거나, PR을 수동으로 완료하세요.",
    partial_draft_created:
      "구현이 중단되었지만, 진행 상황을 보존하기 위해 초안 PR이 생성되었습니다.\n\n**초안 PR:** %s\n**워크플로 실행:** [로그 보기](%s)\n\n**계속하려면:** 다시 시도하려면 `/approve`를 댓글로 달거나, 초안 PR을 수동으로 완료하세요.",
    partial_pr_body_header: "## 부분 구현",
    partial_pr_body:
      "이 PR은 실행이 중단된 후 (최대 턴 수에 도달했을 가능성이 있음) 부분 진행 상황을 보존하기 위해 레오니다스에 의해 자동으로 생성되었습니다.\n\n**상태:** 불완전 — 수동으로 검토하고 계속하거나 다시 시도하세요.\n**워크플로 실행:** [로그 보기](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ 레오니다스 실패",
    failure_plan_body:
      "자동화된 계획이 오류를 발생시켰습니다.\n\n**워크플로 실행:** [로그 보기](%s)\n\n**재시도하려면:** `leonidas` 레이블을 제거한 후 다시 추가하세요.",
    failure_execute_body:
      "자동화된 실행이 오류를 발생시켰습니다.\n\n**워크플로 실행:** [로그 보기](%s)\n\n**재시도하려면:** 이 이슈에 `/approve`를 다시 댓글로 다세요.",
    starting_implementation: "⚡ **레오니다스**가 이슈 #%d에 대한 구현을 시작합니다...",
  },
  ja: {
    plan_header: "## 🏛️ レオニダス実装計画",
    plan_footer:
      "---\n> この計画を承認して実装を開始するには、このissueに `/approve` とコメントしてください。",
    decomposed_plan_footer:
      "---\n> このissueはサブissueに分解されました。各サブissueに `/approve` とコメントして、個別に承認して実行してください。",
    completion_with_pr:
      "✅ **Leonidas**がイシュー #%d の実装を完了しました。詳細はプルリクエスト #%s をご確認ください。",
    completion_no_pr:
      "⚠️ **Leonidas** の実行は完了しましたが、イシュー #%d のプルリクエストを作成できませんでした。ブランチのpushに失敗した可能性があります。\n\n**ワークフロー実行:** [ログを表示](%s)\n\n**再試行するには:** `/approve` を再度コメントしてください。",
    partial_header: "## ⚠️ Leonidas 部分的な進行",
    partial_pr_exists:
      "実装が中断されました（最大ターン数に達した可能性があります）が、PRが存在します。\n\n**プルリクエスト:** #%s\n**ステータス:** 部分的な実装 — 完了した作業を確認するにはPRをレビューしてください。\n**ワークフロー実行:** [ログを表示](%s)\n\n**続行するには:** クリーンなブランチから再試行するには `/approve` を再度コメントするか、PRを手動で完了してください。",
    partial_draft_created:
      "実装が中断されましたが、進行状況を保存するためにドラフトPRが作成されました。\n\n**ドラフトPR:** %s\n**ワークフロー実行:** [ログを表示](%s)\n\n**続行するには:** 再試行するには `/approve` をコメントするか、ドラフトPRを手動で完了してください。",
    partial_pr_body_header: "## 部分的な実装",
    partial_pr_body:
      "このPRは、実行が中断された後（最大ターン数に達した可能性があります）、部分的な進行状況を保存するためにLeonidasによって自動作成されました。\n\n**ステータス:** 不完全 — 手動でレビューして続行するか、再試行してください。\n**ワークフロー実行:** [ログを表示](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas 失敗",
    failure_plan_body:
      "自動計画でエラーが発生しました。\n\n**ワークフロー実行:** [ログを表示](%s)\n\n**再試行するには:** `leonidas` ラベルを削除してから再度追加してください。",
    failure_execute_body:
      "自動実行でエラーが発生しました。\n\n**ワークフロー実行:** [ログを表示](%s)\n\n**再試行するには:** このイシューに `/approve` を再度コメントしてください。",
    starting_implementation: "⚡ **Leonidas**がイシュー #%d の実装を開始しています...",
  },
  zh: {
    plan_header: "## 🏛️ 列奥尼达实施计划",
    plan_footer: "---\n> 要批准此计划并开始实施，请在此问题上评论 `/approve`。",
    decomposed_plan_footer:
      "---\n> 此问题已分解为子问题。请在每个子问题上评论 `/approve` 以分别批准和执行。",
    completion_with_pr: "✅ **Leonidas** 已完成问题 #%d 的实现。请查看拉取请求 #%s 了解详情。",
    completion_no_pr:
      "⚠️ **Leonidas** 执行已完成，但未能为问题 #%d 创建拉取请求。分支推送可能失败。\n\n**工作流运行:** [查看日志](%s)\n\n**重试:** 再次评论 `/approve`。",
    partial_header: "## ⚠️ Leonidas 部分进展",
    partial_pr_exists:
      "实现已中断（可能达到最大轮数），但存在PR。\n\n**拉取请求:** #%s\n**状态:** 部分实现 — 查看PR以了解已完成的工作。\n**工作流运行:** [查看日志](%s)\n\n**继续:** 再次评论 `/approve` 以从干净分支重试，或手动完成PR。",
    partial_draft_created:
      "实现已中断，但创建了草稿PR以保留进度。\n\n**草稿PR:** %s\n**工作流运行:** [查看日志](%s)\n\n**继续:** 评论 `/approve` 重试，或手动完成草稿PR。",
    partial_pr_body_header: "## 部分实现",
    partial_pr_body:
      "此PR由Leonidas自动创建，用于在执行中断后（可能达到最大轮数）保留部分进度。\n\n**状态:** 不完整 — 手动审查并继续或重试。\n**工作流运行:** [查看日志](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas 失败",
    failure_plan_body:
      "自动计划遇到错误。\n\n**工作流运行:** [查看日志](%s)\n\n**重试:** 移除 `leonidas` 标签，然后重新添加。",
    failure_execute_body:
      "自动执行遇到错误。\n\n**工作流运行:** [查看日志](%s)\n\n**重试:** 在此问题上再次评论 `/approve`。",
    starting_implementation: "⚡ **Leonidas** 正在开始实现问题 #%d...",
  },
  es: {
    plan_header: "## 🏛️ Plan de Implementación de Leonidas",
    plan_footer:
      "---\n> Para aprobar este plan e iniciar la implementación, comenta `/approve` en este issue.",
    decomposed_plan_footer:
      "---\n> Este issue ha sido descompuesto en sub-issues. Aprueba y ejecuta cada sub-issue individualmente comentando `/approve` en cada uno.",
    completion_with_pr:
      "✅ **Leonidas** ha completado la implementación del issue #%d. Consulta el pull request #%s para más detalles.",
    completion_no_pr:
      "⚠️ **Leonidas** completó la ejecución pero no pudo crear un pull request para el issue #%d. Es posible que el push de la rama haya fallado.\n\n**Ejecución del workflow:** [Ver logs](%s)\n\n**Para reintentar:** Comenta `/approve` nuevamente.",
    partial_header: "## ⚠️ Progreso Parcial de Leonidas",
    partial_pr_exists:
      "La implementación se interrumpió (probablemente alcanzó el máximo de turnos), pero existe un PR.\n\n**Pull Request:** #%s\n**Estado:** Implementación parcial — revisa el PR para ver el trabajo completado.\n**Ejecución del workflow:** [Ver logs](%s)\n\n**Para continuar:** Comenta `/approve` nuevamente para reintentar desde una rama limpia, o completa el PR manualmente.",
    partial_draft_created:
      "La implementación se interrumpió, pero se creó un PR borrador para preservar el progreso.\n\n**PR Borrador:** %s\n**Ejecución del workflow:** [Ver logs](%s)\n\n**Para continuar:** Comenta `/approve` para reintentar, o completa el PR borrador manualmente.",
    partial_pr_body_header: "## Implementación Parcial",
    partial_pr_body:
      "Este PR fue creado automáticamente por Leonidas para preservar el progreso parcial después de que la ejecución fue interrumpida (probablemente alcanzó el máximo de turnos).\n\n**Estado:** Incompleto — revisa y continúa manualmente o reintenta.\n**Ejecución del workflow:** [Ver logs](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas Falló",
    failure_plan_body:
      "El plan automatizado encontró un error.\n\n**Ejecución del workflow:** [Ver logs](%s)\n\n**Para reintentar:** Elimina la etiqueta `leonidas` y agrégala nuevamente.",
    failure_execute_body:
      "La ejecución automatizada encontró un error.\n\n**Ejecución del workflow:** [Ver logs](%s)\n\n**Para reintentar:** Comenta `/approve` nuevamente en este issue.",
    starting_implementation: "⚡ **Leonidas** está comenzando la implementación del issue #%d...",
  },
  de: {
    plan_header: "## 🏛️ Leonidas Implementierungsplan",
    plan_footer:
      "---\n> Um diesen Plan zu genehmigen und mit der Implementierung zu beginnen, kommentieren Sie `/approve` in diesem Issue.",
    decomposed_plan_footer:
      "---\n> Dieses Issue wurde in Unter-Issues aufgeteilt. Genehmigen und führen Sie jedes Unter-Issue einzeln aus, indem Sie `/approve` in jedem kommentieren.",
    completion_with_pr:
      "✅ **Leonidas** hat die Implementierung für Issue #%d abgeschlossen. Weitere Details finden Sie im Pull Request #%s.",
    completion_no_pr:
      "⚠️ **Leonidas** Ausführung abgeschlossen, aber der Pull Request für Issue #%d konnte nicht erstellt werden. Der Branch-Push ist möglicherweise fehlgeschlagen.\n\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\n**Zum Wiederholen:** Kommentieren Sie erneut `/approve`.",
    partial_header: "## ⚠️ Leonidas Teilfortschritt",
    partial_pr_exists:
      "Die Implementierung wurde unterbrochen (wahrscheinlich maximale Anzahl von Durchläufen erreicht), aber ein PR existiert.\n\n**Pull Request:** #%s\n**Status:** Teilimplementierung — überprüfen Sie den PR für die abgeschlossene Arbeit.\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\n**Zum Fortfahren:** Kommentieren Sie erneut `/approve`, um von einem sauberen Branch aus zu wiederholen, oder schließen Sie den PR manuell ab.",
    partial_draft_created:
      "Die Implementierung wurde unterbrochen, aber ein Entwurfs-PR wurde erstellt, um den Fortschritt zu bewahren.\n\n**Entwurfs-PR:** %s\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\n**Zum Fortfahren:** Kommentieren Sie `/approve`, um zu wiederholen, oder schließen Sie den Entwurfs-PR manuell ab.",
    partial_pr_body_header: "## Teilimplementierung",
    partial_pr_body:
      "Dieser PR wurde automatisch von Leonidas erstellt, um den Teilfortschritt nach Unterbrechung der Ausführung zu bewahren (wahrscheinlich maximale Anzahl von Durchläufen erreicht).\n\n**Status:** Unvollständig — überprüfen und manuell fortfahren oder wiederholen.\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas Fehlgeschlagen",
    failure_plan_body:
      "Der automatisierte Plan ist auf einen Fehler gestoßen.\n\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\n**Zum Wiederholen:** Entfernen Sie das `leonidas` Label und fügen Sie es erneut hinzu.",
    failure_execute_body:
      "Die automatisierte Ausführung ist auf einen Fehler gestoßen.\n\n**Workflow-Ausführung:** [Logs anzeigen](%s)\n\n**Zum Wiederholen:** Kommentieren Sie erneut `/approve` in diesem Issue.",
    starting_implementation: "⚡ **Leonidas** beginnt mit der Implementierung von Issue #%d...",
  },
  fr: {
    plan_header: "## 🏛️ Plan d'Implémentation Leonidas",
    plan_footer:
      "---\n> Pour approuver ce plan et commencer l'implémentation, commentez `/approve` sur ce ticket.",
    decomposed_plan_footer:
      "---\n> Ce ticket a été décomposé en sous-tickets. Approuvez et exécutez chaque sous-ticket individuellement en commentant `/approve` sur chacun.",
    completion_with_pr:
      "✅ **Leonidas** a terminé l'implémentation du ticket #%d. Consultez la pull request #%s pour plus de détails.",
    completion_no_pr:
      "⚠️ **Leonidas** a terminé l'exécution mais n'a pas pu créer de pull request pour le ticket #%d. Le push de la branche a peut-être échoué.\n\n**Exécution du workflow :** [Voir les logs](%s)\n\n**Pour réessayer :** Commentez à nouveau `/approve`.",
    partial_header: "## ⚠️ Progrès Partiel de Leonidas",
    partial_pr_exists:
      "L'implémentation a été interrompue (probablement atteint le nombre maximum de tours), mais une PR existe.\n\n**Pull Request :** #%s\n**Statut :** Implémentation partielle — consultez la PR pour le travail terminé.\n**Exécution du workflow :** [Voir les logs](%s)\n\n**Pour continuer :** Commentez à nouveau `/approve` pour réessayer depuis une branche propre, ou complétez la PR manuellement.",
    partial_draft_created:
      "L'implémentation a été interrompue, mais une PR brouillon a été créée pour préserver les progrès.\n\n**PR Brouillon :** %s\n**Exécution du workflow :** [Voir les logs](%s)\n\n**Pour continuer :** Commentez `/approve` pour réessayer, ou complétez la PR brouillon manuellement.",
    partial_pr_body_header: "## Implémentation Partielle",
    partial_pr_body:
      "Cette PR a été créée automatiquement par Leonidas pour préserver les progrès partiels après l'interruption de l'exécution (probablement atteint le nombre maximum de tours).\n\n**Statut :** Incomplet — examinez et continuez manuellement ou réessayez.\n**Exécution du workflow :** [Voir les logs](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Échec de Leonidas",
    failure_plan_body:
      "Le plan automatisé a rencontré une erreur.\n\n**Exécution du workflow :** [Voir les logs](%s)\n\n**Pour réessayer :** Retirez le label `leonidas` puis rajoutez-le.",
    failure_execute_body:
      "L'exécution automatisée a rencontré une erreur.\n\n**Exécution du workflow :** [Voir les logs](%s)\n\n**Pour réessayer :** Commentez à nouveau `/approve` sur ce ticket.",
    starting_implementation: "⚡ **Leonidas** commence l'implémentation du ticket #%d...",
  },
  pt: {
    plan_header: "## 🏛️ Plano de Implementação Leonidas",
    plan_footer:
      "---\n> Para aprovar este plano e iniciar a implementação, comente `/approve` neste issue.",
    decomposed_plan_footer:
      "---\n> Este issue foi decomposto em sub-issues. Aprove e execute cada sub-issue individualmente comentando `/approve` em cada um.",
    completion_with_pr:
      "✅ **Leonidas** concluiu a implementação do issue #%d. Consulte o pull request #%s para mais detalhes.",
    completion_no_pr:
      "⚠️ **Leonidas** concluiu a execução mas não conseguiu criar um pull request para o issue #%d. O push do branch pode ter falhado.\n\n**Execução do workflow:** [Ver logs](%s)\n\n**Para tentar novamente:** Comente `/approve` novamente.",
    partial_header: "## ⚠️ Progresso Parcial do Leonidas",
    partial_pr_exists:
      "A implementação foi interrompida (provavelmente atingiu o número máximo de turnos), mas existe um PR.\n\n**Pull Request:** #%s\n**Status:** Implementação parcial — revise o PR para ver o trabalho concluído.\n**Execução do workflow:** [Ver logs](%s)\n\n**Para continuar:** Comente `/approve` novamente para tentar novamente a partir de um branch limpo, ou complete o PR manualmente.",
    partial_draft_created:
      "A implementação foi interrompida, mas um PR rascunho foi criado para preservar o progresso.\n\n**PR Rascunho:** %s\n**Execução do workflow:** [Ver logs](%s)\n\n**Para continuar:** Comente `/approve` para tentar novamente, ou complete o PR rascunho manualmente.",
    partial_pr_body_header: "## Implementação Parcial",
    partial_pr_body:
      "Este PR foi criado automaticamente pelo Leonidas para preservar o progresso parcial após a execução ser interrompida (provavelmente atingiu o número máximo de turnos).\n\n**Status:** Incompleto — revise e continue manualmente ou tente novamente.\n**Execução do workflow:** [Ver logs](%s)\n\nCloses #%d",
    failure_header: "## ⚠️ Leonidas Falhou",
    failure_plan_body:
      "O plano automatizado encontrou um erro.\n\n**Execução do workflow:** [Ver logs](%s)\n\n**Para tentar novamente:** Remova o label `leonidas` e adicione-o novamente.",
    failure_execute_body:
      "A execução automatizada encontrou um erro.\n\n**Execução do workflow:** [Ver logs](%s)\n\n**Para tentar novamente:** Comente `/approve` novamente neste issue.",
    starting_implementation: "⚡ **Leonidas** está iniciando a implementação do issue #%d...",
  },
};

/**
 * Translation function that retrieves localized strings and performs string interpolation
 * @param key - The translation key to look up
 * @param lang - The language code (defaults to "en")
 * @param args - Values to interpolate into the string (%d for numbers, %s for strings)
 * @returns The translated and interpolated string
 */
export function t(
  key: TranslationKey,
  lang: SupportedLanguage = "en",
  ...args: (string | number)[]
): string {
  const resolvedLang = resolveLanguage(lang);
  const template = translations[resolvedLang][key];

  if (!template) {
    return `[Missing translation: ${key}]`;
  }

  if (args.length === 0) {
    return template;
  }

  // Replace placeholders with provided arguments
  let result = template;
  let argIndex = 0;

  // Replace %d and %s placeholders sequentially
  result = result.replace(/%[ds]/g, (match) => {
    if (argIndex >= args.length) {
      return match; // No more arguments, leave placeholder as-is
    }
    const arg = args[argIndex++];
    return String(arg);
  });

  return result;
}
