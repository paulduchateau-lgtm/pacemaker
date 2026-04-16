import type { Theme } from "./index";

function sanitize(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

/**
 * Thème Agirc-Arrco DAS — Mission BI Power BI.
 * Palette sur mesure dérivée de l'univers graphique Agirc-Arrco 2026.
 * Cf. AGIRC-ARRCO-DESIGN-SYSTEM.md v3.0.
 */
export const agircArrco: Theme = {
  id: "agirc-arrco",
  name: "Agirc-Arrco DAS",
  palette: {
    primary: "271132", // AA Violet signature
    accent: "FF7D53", // AA Orange highlight
    alert: "951A81", // AA Rose
    positive: "2E7D3A", // Green sémantique
    ink: "1A1A1A",
    muted: "5C5C5C",
    paper: "FFFFFF",
    paperSoft: "F2F0F2", // Violet tint 5
    zebra: "F2F2F2",
    emphasis: "E5E2E6", // Violet tint 10
    tintPositive: "FFEBE5", // Orange tint 15
    tintCritical: "EFDCEC", // Rose tint 15
    border: "BFBFBF", // Ink 30
  },
  fonts: {
    sans: "Calibri",
    mono: "Consolas",
  },
  sectionMarker: "square",
  headerBand: true,
  defaultLegal:
    "Document confidentiel — Usage interne Agirc-Arrco. Toute reproduction ou diffusion sans autorisation écrite est interdite.",
  filename: ({ title, date, version, docType, extension }) => {
    const v = version ? `_v${version}` : "_v1.0";
    const type = docType ? `_${sanitize(docType)}` : "";
    return `AA-DAS-BI_${date}${type}_${sanitize(title)}${v}.${extension}`;
  },
  promptHints: `STYLE AGIRC-ARRCO DAS :
- Ton institutionnel, sobre, orienté direction.
- Palette imposée : violet #271132 (titres), orange #FF7D53 (highlights), rose #951A81 (alertes).
- Typographie Calibri.
- Ajoute systématiquement en tête un bloc "cover" avec meta : client="Agirc-Arrco / DAS", emitter="O&B Consulting — Paul Duchâteau", date, version, confidential="Confidentiel — Usage interne Agirc-Arrco".
- Termine toujours par un bloc "footer_legal" (mention confidentielle).
- Les KPI critiques doivent utiliser tone="critical", les positifs tone="positive".
- Limite la surface "accent/alert" : un à deux éléments par page max.`,
};
