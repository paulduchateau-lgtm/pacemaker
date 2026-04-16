import type { Theme } from "./index";

function sanitize(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export const liteops: Theme = {
  id: "liteops",
  name: "LiteOps",
  palette: {
    primary: "1C1C1A",
    accent: "A5D900",
    alert: "D95B2F",
    positive: "7AB800",
    ink: "1C1C1A",
    muted: "8A8680",
    paper: "F0EEEB",
    paperSoft: "F6F4F0",
    zebra: "F6F4F0",
    emphasis: "E8E5DF",
    tintPositive: "EFF7D6",
    tintCritical: "FAE5DB",
    border: "D4D0CA",
  },
  fonts: {
    sans: "DM Sans",
    mono: "JetBrains Mono",
  },
  sectionMarker: "none",
  headerBand: false,
  defaultLegal: "LITE●OPS — Pacemaker. Usage interne mission.",
  filename: ({ title, extension }) => `${sanitize(title)}.${extension}`,
  promptHints: `STYLE LITEOPS :
- Ton sobre, factuel, orienté données.
- Aucune couleur imposée — le rendu utilise le vert signal A5D900 en accent.
- Pas de "carré orange" ni de mention confidentielle.`,
};
