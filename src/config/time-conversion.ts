/**
 * Table de conversion minutes-consultant-économisées par activité.
 * Médianes validées par Paul le 2026-04-18 (cf. docs/design/time-conversion-ranges.md).
 *
 * Règle : on ne logue que sur signal d'usage (pas à la simple génération —
 * éviter de gonfler artificiellement).
 */

export type TimeActivity =
  | "task_creation_llm"
  | "cr_parsing"
  | "vision_extract"
  | "livrable_generation"
  | "livrable_correction"
  | "briefing_consulted"
  | "recalibration_manual"
  | "recalibration_auto"
  | "incoherence_flagged"
  | "decision_captured_rich"
  | "schedule_cascade"
  | "doc_indexed_rag";

export const TIME_SAVED_MINUTES: Record<TimeActivity, number> = {
  task_creation_llm: 15,
  cr_parsing: 25,
  vision_extract: 15,
  livrable_generation: 45,
  livrable_correction: 8,
  briefing_consulted: 10,
  recalibration_manual: 30,
  recalibration_auto: 25,
  incoherence_flagged: 20,
  decision_captured_rich: 5,
  schedule_cascade: 10,
  doc_indexed_rag: 2,
};

export const ACTIVITY_LABELS: Record<TimeActivity, string> = {
  task_creation_llm: "Génération de tâches",
  cr_parsing: "Parsing de CR",
  vision_extract: "Extraction photo",
  livrable_generation: "Génération livrable",
  livrable_correction: "Correction apprise",
  briefing_consulted: "Briefing consulté",
  recalibration_manual: "Recalibration manuelle",
  recalibration_auto: "Recalibration auto",
  incoherence_flagged: "Incohérence détectée",
  decision_captured_rich: "Décision consignée",
  schedule_cascade: "Cascade de planning",
  doc_indexed_rag: "Document indexé RAG",
};
