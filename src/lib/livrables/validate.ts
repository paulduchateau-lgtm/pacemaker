import type { Block, LivrablePayload, Sheet } from "./types";

/**
 * Validation légère sans zod. Rejette tout payload non conforme au schéma.
 * Retourne le payload typé, ou null si invalide.
 */
export function parseLivrablePayload(raw: string): LivrablePayload | null {
  let json: unknown;
  try {
    // Tolère un JSON encadré de ```json ... ``` ou de texte parasite
    const cleaned = stripFences(raw).trim();
    json = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!isObject(json)) return null;
  const title = str(json.title);
  if (!title) return null;
  const format = asFormat(json.format);
  const blocks = Array.isArray(json.blocks)
    ? json.blocks.map(validateBlock).filter((b): b is Block => b !== null)
    : undefined;
  const sheets = Array.isArray(json.sheets)
    ? json.sheets.map(validateSheet).filter((s): s is Sheet => s !== null)
    : undefined;
  if (!blocks && !sheets) return null;
  return {
    title,
    subtitle: str(json.subtitle),
    docType: str(json.docType),
    format,
    blocks,
    sheets,
  };
}

function stripFences(s: string): string {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1];
  return s;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

function asFormat(v: unknown): "docx" | "xlsx" | "pptx" | undefined {
  return v === "docx" || v === "xlsx" || v === "pptx" ? v : undefined;
}

function asTone(v: unknown): "positive" | "neutral" | "critical" {
  return v === "positive" || v === "critical" ? v : "neutral";
}

function validateSheet(v: unknown): Sheet | null {
  if (!isObject(v)) return null;
  const name = str(v.name);
  if (!name) return null;
  const blocks = Array.isArray(v.blocks)
    ? v.blocks.map(validateBlock).filter((b): b is Block => b !== null)
    : [];
  return { name, blocks };
}

function validateBlock(v: unknown): Block | null {
  if (!isObject(v)) return null;
  const kind = v.kind;
  if (kind === "cover") {
    const title = str(v.title);
    if (!title) return null;
    const meta = isObject(v.meta) ? (v.meta as Record<string, unknown>) : undefined;
    return {
      kind: "cover",
      title,
      subtitle: str(v.subtitle),
      meta: meta
        ? {
            client: str(meta.client),
            emitter: str(meta.emitter),
            date: str(meta.date),
            version: str(meta.version),
            confidential: str(meta.confidential),
          }
        : undefined,
    };
  }
  if (kind === "toc" && Array.isArray(v.items)) {
    return { kind: "toc", items: v.items.filter((x): x is string => typeof x === "string") };
  }
  if (kind === "section") {
    const title = str(v.title);
    const lvl = v.level === 1 || v.level === 2 || v.level === 3 ? v.level : 1;
    if (!title) return null;
    return { kind: "section", level: lvl, title };
  }
  if (kind === "paragraph") {
    const text = str(v.text);
    if (!text) return null;
    return { kind: "paragraph", text, emphasis: v.emphasis === true };
  }
  if ((kind === "bullet_list" || kind === "numbered_list") && Array.isArray(v.items)) {
    const items = v.items.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    if (items.length === 0) return null;
    return { kind, items };
  }
  if (kind === "kpi_grid" && Array.isArray(v.cards)) {
    const cols = v.cols === 2 || v.cols === 3 || v.cols === 4 ? v.cols : 3;
    const cards: { label: string; value: string; delta?: string; tone: "positive" | "neutral" | "critical" }[] = [];
    for (const c of v.cards) {
      if (!isObject(c)) continue;
      const label = str(c.label);
      const value = str(c.value);
      if (!label || !value) continue;
      const delta = str(c.delta);
      cards.push(delta ? { label, value, delta, tone: asTone(c.tone) } : { label, value, tone: asTone(c.tone) });
    }
    if (cards.length === 0) return null;
    return { kind: "kpi_grid", cols, cards };
  }
  if (kind === "table" && Array.isArray(v.headers) && Array.isArray(v.rows)) {
    const headers = v.headers.filter((x): x is string => typeof x === "string");
    const rows = v.rows
      .filter(Array.isArray)
      .map((row) =>
        row.map((cell: unknown) => {
          if (typeof cell === "string") return cell;
          if (isObject(cell) && typeof cell.value === "string") {
            return { value: cell.value, tone: asTone(cell.tone) };
          }
          return "";
        })
      );
    const totals = Array.isArray(v.totals) ? v.totals.filter((x): x is string => typeof x === "string") : undefined;
    return { kind: "table", headers, rows, totals };
  }
  if (kind === "callout") {
    const text = str(v.text);
    if (!text) return null;
    return { kind: "callout", text, tone: asTone(v.tone) };
  }
  if (kind === "star_note") {
    const text = str(v.text);
    if (!text) return null;
    return { kind: "star_note", text };
  }
  if (kind === "footer_legal") {
    const text = str(v.text);
    if (!text) return null;
    return { kind: "footer_legal", text };
  }
  return null;
}
