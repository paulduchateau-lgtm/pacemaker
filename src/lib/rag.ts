import { query, execute } from "./db";
import { getEmbedding, getEmbeddings } from "./embeddings";
import type { RagSearchResult } from "@/types";

/**
 * Chunk text into ~500 token pieces with 50 token overlap,
 * respecting sentence boundaries.
 */
export function chunkText(text: string, maxTokens = 500, overlap = 50): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const combined = current ? `${current} ${sentence.trim()}` : sentence.trim();
    const estimatedTokens = Math.ceil(combined.length / 4);

    if (estimatedTokens > maxTokens && current) {
      chunks.push(current.trim());
      const overlapChars = overlap * 4;
      const overlapStart = Math.max(0, current.length - overlapChars);
      current = current.slice(overlapStart) + " " + sentence.trim();
    } else {
      current = combined;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Index a document: chunk it, embed chunks, store in doc_chunks.
 * mission_id vit sur la row `documents` — les chunks héritent par jointure.
 */
export async function indexDocument(docId: string, content: string): Promise<number> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return 0;

  const embeddings = await getEmbeddings(chunks, "document");

  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const embeddingBlob = `[${embeddings[i].join(",")}]`;
    await execute(
      `INSERT INTO doc_chunks (id, doc_id, chunk_index, content, embedding)
       VALUES (?, ?, ?, ?, vector(?))`,
      [chunkId, docId, i, chunks[i], embeddingBlob],
    );
  }

  // Chantier 8 : temps gagné. Récupère mission_id depuis le document.
  try {
    const { logTimeSaving } = await import("./time-savings");
    const rows = await query(
      "SELECT mission_id FROM documents WHERE id = ? LIMIT 1",
      [docId],
    );
    const missionId = rows[0]?.mission_id as string | null;
    if (missionId) {
      await logTimeSaving({
        missionId,
        activity: "doc_indexed_rag",
        sourceEntityType: "document",
        sourceEntityId: docId,
      });
    }
  } catch {
    /* best-effort */
  }

  return chunks.length;
}

/**
 * Recherche sémantique dans les documents de la mission active (ou de toutes
 * si missionId omis — utile en dev/debug seulement).
 */
export async function searchDocs(
  queryText: string,
  limit: number = 5,
  missionId?: string,
): Promise<RagSearchResult[]> {
  const queryEmbedding = await getEmbedding(queryText, "query");
  const embeddingBlob = `[${queryEmbedding.join(",")}]`;

  const sql = missionId
    ? `SELECT c.id, c.doc_id, c.content, d.title,
              vector_distance_cos(c.embedding, vector(?)) as distance
       FROM doc_chunks c
       JOIN documents d ON d.id = c.doc_id
       WHERE d.mission_id = ?
       ORDER BY distance ASC
       LIMIT ?`
    : `SELECT c.id, c.doc_id, c.content, d.title,
              vector_distance_cos(c.embedding, vector(?)) as distance
       FROM doc_chunks c
       JOIN documents d ON d.id = c.doc_id
       ORDER BY distance ASC
       LIMIT ?`;
  const args = missionId
    ? [embeddingBlob, missionId, limit]
    : [embeddingBlob, limit];
  const rows = await query(sql, args);

  return rows.map((r) => ({
    chunkId: r.id as string,
    docId: r.doc_id as string,
    docTitle: r.title as string,
    content: r.content as string,
    distance: r.distance as number,
  }));
}

/**
 * Contexte RAG à injecter en tête d'un prompt LLM, scopé à la mission.
 */
export async function getRelevantContext(
  queryText: string,
  opts: { weekId?: number; missionId?: string } = {},
): Promise<string> {
  try {
    const results = await searchDocs(queryText, 8, opts.missionId);
    const threshold = opts.weekId ? 0.75 : 0.7;
    const relevant = results.filter((r) => r.distance <= threshold);

    if (relevant.length === 0) return "";

    const contextBlocks = relevant
      .map((r) => `[${r.docTitle}] ${r.content}`)
      .join("\n\n");

    return `\n=== CONTEXTE DOCUMENTAIRE PERTINENT (RAG) ===\n${contextBlocks}\n=== FIN CONTEXTE ===\n`;
  } catch {
    // RAG est optionnel — Voyage absent = skip sans bloquer
    return "";
  }
}
