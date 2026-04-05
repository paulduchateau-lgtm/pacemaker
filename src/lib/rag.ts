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
      // Overlap: keep last ~overlap tokens worth of text
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
       VALUES (?, ?, ?, ?, vector(?))`
      ,
      [chunkId, docId, i, chunks[i], embeddingBlob]
    );
  }

  return chunks.length;
}

/**
 * Search documents by semantic similarity.
 */
export async function searchDocs(
  queryText: string,
  limit: number = 5
): Promise<RagSearchResult[]> {
  const queryEmbedding = await getEmbedding(queryText, "query");
  const embeddingBlob = `[${queryEmbedding.join(",")}]`;

  const rows = await query(
    `SELECT c.id, c.doc_id, c.content, d.title,
            vector_distance_cos(c.embedding, vector(?)) as distance
     FROM doc_chunks c
     JOIN documents d ON d.id = c.doc_id
     ORDER BY distance ASC
     LIMIT ?`,
    [embeddingBlob, limit]
  );

  return rows.map((r) => ({
    chunkId: r.id as string,
    docId: r.doc_id as string,
    docTitle: r.title as string,
    content: r.content as string,
    distance: r.distance as number,
  }));
}

/**
 * Get relevant context for a prompt, filtered by distance threshold.
 */
export async function getRelevantContext(
  queryText: string,
  weekId?: number
): Promise<string> {
  try {
    const results = await searchDocs(queryText, 8);
    const threshold = weekId ? 0.75 : 0.70;
    const relevant = results.filter((r) => r.distance <= threshold);

    if (relevant.length === 0) return "";

    const contextBlocks = relevant
      .map((r) => `[${r.docTitle}] ${r.content}`)
      .join("\n\n");

    return `\n=== CONTEXTE DOCUMENTAIRE PERTINENT (RAG) ===\n${contextBlocks}\n=== FIN CONTEXTE ===\n`;
  } catch {
    // RAG is optional — if Voyage API is not configured, skip
    return "";
  }
}
