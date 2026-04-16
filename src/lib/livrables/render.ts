import type { LivrableFormat, LivrablePayload } from "./types";
import { getTheme } from "./themes";
import { renderDocx } from "./renderers/docx";
import { renderXlsx } from "./renderers/xlsx";
import { renderPptx } from "./renderers/pptx";

export interface RenderResult {
  buffer: Buffer;
  contentType: string;
  extension: LivrableFormat;
  filename: string;
}

const CONTENT_TYPES: Record<LivrableFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function detectFormat(hint: string | undefined): LivrableFormat {
  const f = (hint ?? "").toLowerCase();
  if (f.includes("excel") || f.includes("xlsx") || f.includes("tableur") || f.includes("tableau") || f.includes("classeur")) return "xlsx";
  if (f.includes("ppt") || f.includes("présentation") || f.includes("presentation") || f.includes("slide") || f.includes("diapo") || f.includes("deck")) return "pptx";
  return "docx";
}

/**
 * Orchestrateur : résout le thème, choisit le renderer, construit le nom de fichier.
 */
export async function renderLivrable(
  payload: LivrablePayload,
  opts: { themeId?: string | null; format?: LivrableFormat; version?: string }
): Promise<RenderResult> {
  const theme = getTheme(opts.themeId);
  const extension: LivrableFormat = opts.format ?? payload.format ?? "docx";

  let buffer: Buffer;
  if (extension === "xlsx") buffer = await renderXlsx(payload, theme);
  else if (extension === "pptx") buffer = await renderPptx(payload, theme);
  else buffer = await renderDocx(payload, theme);

  const filename = theme.filename({
    title: payload.title,
    date: todayIso(),
    version: opts.version,
    docType: payload.docType,
    extension,
  });

  return {
    buffer,
    contentType: CONTENT_TYPES[extension],
    extension,
    filename,
  };
}
