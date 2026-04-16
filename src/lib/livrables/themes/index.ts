import { liteops } from "./liteops";
import { agircArrco } from "./agirc-arrco";

export interface ThemePalette {
  /** couleur signature (titres, bandeaux) */
  primary: string;
  /** accent (carrés, KPI positifs, highlights) */
  accent: string;
  /** alerte (KPI critiques) */
  alert: string;
  /** vert sémantique pour écarts positifs */
  positive: string;
  /** texte principal */
  ink: string;
  /** texte secondaire */
  muted: string;
  /** fond paper */
  paper: string;
  /** fond discret */
  paperSoft: string;
  /** fond ligne paire tableau */
  zebra: string;
  /** fond emphase / ligne de total */
  emphasis: string;
  /** tint KPI positif */
  tintPositive: string;
  /** tint KPI critique */
  tintCritical: string;
  /** séparateurs */
  border: string;
}

export interface ThemeFonts {
  sans: string;
  mono: string;
}

export interface FilenameContext {
  title: string;
  date: string;
  version?: string;
  docType?: string;
  extension: "docx" | "xlsx" | "pptx";
}

export interface Theme {
  id: string;
  name: string;
  palette: ThemePalette;
  fonts: ThemeFonts;
  /** signature visuelle avant chaque H1 ("square" = carré accent, "none" = rien) */
  sectionMarker: "square" | "none";
  /** bandeau supérieur plein dans DOCX/PPTX */
  headerBand: boolean;
  /** mention légale par défaut en pied (utilisée si footer_legal absent) */
  defaultLegal: string;
  /** construit le nom de fichier final — incluant extension */
  filename: (ctx: FilenameContext) => string;
  /** bloc signature supplémentaire injecté dans le prompt (contraintes de style) */
  promptHints: string;
}

const registry: Record<string, Theme> = {
  liteops,
  "agirc-arrco": agircArrco,
};

export const DEFAULT_THEME_ID = "liteops";

export function getTheme(id: string | undefined | null): Theme {
  if (!id) return registry[DEFAULT_THEME_ID];
  return registry[id] ?? registry[DEFAULT_THEME_ID];
}

export function listThemes(): Array<{ id: string; name: string }> {
  return Object.values(registry).map((t) => ({ id: t.id, name: t.name }));
}

export { liteops, agircArrco };
