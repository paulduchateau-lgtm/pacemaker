import type { Phase } from "@/types";

export const PHASES: Phase[] = [
  "Cadrage",
  "Construction socle",
  "Développement",
  "Stabilisation",
  "Transfert",
];

export const PHASE_COLORS: Record<Phase, string> = {
  Cadrage: "#A5D900",
  "Construction socle": "#7AB800",
  Développement: "#2D7D9A",
  Stabilisation: "#E8A317",
  Transfert: "#D95B2F",
};

export const PHASE_WEEKS: Record<Phase, number[]> = {
  Cadrage: [1],
  "Construction socle": [2],
  Développement: [3, 4, 5],
  Stabilisation: [6],
  Transfert: [7],
};
