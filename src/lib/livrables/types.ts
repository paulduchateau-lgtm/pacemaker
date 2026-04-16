/**
 * LivrablePayload — schéma de sortie structurée des livrables.
 *
 * Le LLM produit ce JSON (au lieu de markdown). Un renderer consomme (payload, theme)
 * et produit un fichier brandé. Un thème ne change que la présentation, jamais la structure.
 */

export type BlockTone = "positive" | "neutral" | "critical";

export interface CoverMeta {
  client?: string;
  emitter?: string;
  date?: string;
  version?: string;
  confidential?: string;
}

export interface KpiCard {
  label: string;
  value: string;
  delta?: string;
  tone: BlockTone;
}

export interface TableCell {
  value: string;
  tone?: BlockTone;
}

export type Block =
  | { kind: "cover"; title: string; subtitle?: string; meta?: CoverMeta }
  | { kind: "toc"; items: string[] }
  | { kind: "section"; level: 1 | 2 | 3; title: string }
  | { kind: "paragraph"; text: string; emphasis?: boolean }
  | { kind: "bullet_list"; items: string[] }
  | { kind: "numbered_list"; items: string[] }
  | { kind: "kpi_grid"; cols: 2 | 3 | 4; cards: KpiCard[] }
  | {
      kind: "table";
      headers: string[];
      rows: (string | TableCell)[][];
      totals?: string[];
    }
  | { kind: "callout"; text: string; tone: BlockTone }
  | { kind: "star_note"; text: string }
  | { kind: "footer_legal"; text: string };

export interface Sheet {
  name: string;
  blocks: Block[];
}

export interface LivrablePayload {
  /** format cible — si absent, détecté depuis livrable.format au niveau de l'appelant */
  format?: "docx" | "xlsx" | "pptx";
  /** blocs pour DOCX/PPTX (flat) */
  blocks?: Block[];
  /** onglets pour XLSX (quand le livrable est un classeur multi-feuilles) */
  sheets?: Sheet[];
  /** titre utilisé pour le nom de fichier */
  title: string;
  /** sous-titre éventuel, utilisé par certains thèmes */
  subtitle?: string;
  /** type de document (CR, Annexe, Deck, Note...) — utilisé dans le nommage thème AA */
  docType?: string;
}

export type LivrableFormat = "docx" | "xlsx" | "pptx";
