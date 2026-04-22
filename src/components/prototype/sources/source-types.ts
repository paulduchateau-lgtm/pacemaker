export interface Source {
  id: string;
  kind: string;
  title: string;
  fmt: string;
  uploaded: string;
  freshness: "live" | "fresh" | "stale" | "old";
  used: number;
  extracts: string[];
  stale: boolean;
  staleNote?: string;
  inconsistency: boolean;
  blobUrl: string | null;
  contentPreview: string | null;
}

export const KIND_META: Record<string, { label: string; icon: string }> = {
  doc: { label: "Documents", icon: "file" },
  plaud: { label: "Plaud", icon: "plaud" },
  vision: { label: "Photos", icon: "camera" },
};

const IMAGE_FMTS = new Set(["PHOTO", "JPG", "JPEG", "PNG", "WEBP", "HEIC", "GIF"]);

export function isImage(s: Source): boolean {
  if (!s.blobUrl) return false;
  if (IMAGE_FMTS.has(s.fmt)) return true;
  if (s.kind === "vision") return true;
  return /\.(jpe?g|png|webp|heic|gif)(\?|$)/i.test(s.blobUrl);
}

export function freshnessFrom(uploadedIso: string): Source["freshness"] {
  const ageDays = (Date.now() - new Date(uploadedIso).getTime()) / (24 * 3600 * 1000);
  if (ageDays < 2) return "live";
  if (ageDays < 5) return "fresh";
  if (ageDays < 10) return "stale";
  return "old";
}

export function mapDocToSource(d: Record<string, unknown>): Source {
  const type = String(d.type ?? "doc");
  const source = String(d.source ?? "manual");
  let kind = type;
  if (type === "plaud" || source === "plaud") kind = "plaud";
  else if (type === "photo" || source === "vision") kind = "vision";
  else if (type === "cr" || type === "note" || type === "spec") kind = "doc";
  const uploaded = String(d.createdAt ?? d.created_at ?? new Date().toISOString());
  const rawContent = (d.content as string | null) ?? null;
  return {
    id: String(d.id),
    kind,
    title: String(d.title ?? "Source"),
    fmt: type.toUpperCase(),
    uploaded,
    freshness: freshnessFrom(uploaded),
    used: 0,
    extracts: [],
    stale: false,
    inconsistency: false,
    blobUrl: (d.blobUrl as string | null) ?? (d.blob_url as string | null) ?? null,
    contentPreview: rawContent ? rawContent.slice(0, 600) : null,
  };
}
