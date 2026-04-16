import type { Block, LivrablePayload } from "./types";

/**
 * Convertit une sortie markdown "historique" en LivrablePayload basique.
 * Utilisé comme filet de sécurité si le LLM ne parvient pas à produire un JSON valide.
 * On reste volontairement simple : couverture, sections, paragraphes, bullets.
 */
export function markdownToPayload(
  markdown: string,
  fallback: { title: string; subtitle?: string; docType?: string }
): LivrablePayload {
  const blocks: Block[] = [];
  blocks.push({
    kind: "cover",
    title: fallback.title,
    subtitle: fallback.subtitle,
  });

  const lines = markdown.split("\n");
  let pendingBullets: string[] = [];
  const flushBullets = () => {
    if (pendingBullets.length) {
      blocks.push({ kind: "bullet_list", items: pendingBullets });
      pendingBullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushBullets();
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushBullets();
      blocks.push({ kind: "section", level: 3, title: line.replace(/^###\s+/, "") });
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushBullets();
      blocks.push({ kind: "section", level: 2, title: line.replace(/^##\s+/, "") });
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushBullets();
      blocks.push({ kind: "section", level: 1, title: line.replace(/^#\s+/, "") });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      pendingBullets.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushBullets();
    blocks.push({ kind: "paragraph", text: line.trim() });
  }
  flushBullets();

  return {
    title: fallback.title,
    subtitle: fallback.subtitle,
    docType: fallback.docType,
    blocks,
  };
}
