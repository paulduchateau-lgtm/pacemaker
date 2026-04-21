import { query } from "./db";
import { getEmbedding } from "./embeddings";
import type { GenerationType, Rule } from "@/types";

/**
 * Retrieve relevant learned rules for a given generation type and context.
 * Uses vector similarity search, filtered by type and status.
 * Returns max 5 rules above the similarity threshold (0.65).
 */
export async function getRelevantRules(
  generationType: GenerationType,
  context: Record<string, unknown>,
  opts: { limit?: number; missionId?: string } = {},
): Promise<Rule[]> {
  const limit = opts.limit ?? 5;
  try {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    const queryText = `${generationType} ${contextStr}`;
    const queryEmbedding = await getEmbedding(queryText, "query");
    const embeddingBlob = `[${queryEmbedding.join(",")}]`;

    // Chantier 6 : filtre similarité > 0.65 POUSSÉ DANS SQL (avant,
    // ORDER BY distance + LIMIT N puis filter côté JS → si les N plus proches
    // dépassent le seuil, on recevait 0 règle alors qu'une 6e aurait pu
    // passer. Maintenant WHERE embauche le filtre avant LIMIT).
    // Seuil similarité > 0.65 ⇔ distance < 0.35.
    const MAX_DISTANCE = 0.35;
    const sql = opts.missionId
      ? `SELECT id, rule_learned, generation_type, applied_count, created_at,
                vector_distance_cos(rule_embedding, vector(?)) as distance
         FROM corrections
         WHERE generation_type = ? AND status = 'active' AND mission_id = ?
           AND vector_distance_cos(rule_embedding, vector(?)) < ?
         ORDER BY distance ASC
         LIMIT ?`
      : `SELECT id, rule_learned, generation_type, applied_count, created_at,
                vector_distance_cos(rule_embedding, vector(?)) as distance
         FROM corrections
         WHERE generation_type = ? AND status = 'active'
           AND vector_distance_cos(rule_embedding, vector(?)) < ?
         ORDER BY distance ASC
         LIMIT ?`;
    const args = opts.missionId
      ? [embeddingBlob, generationType, opts.missionId, embeddingBlob, MAX_DISTANCE, limit]
      : [embeddingBlob, generationType, embeddingBlob, MAX_DISTANCE, limit];
    const rows = await query(sql, args);

    return rows.map((r) => ({
      id: r.id as string,
      type: r.generation_type as GenerationType,
      text: r.rule_learned as string,
      appliedCount: r.applied_count as number,
      createdAt: r.created_at as string,
    }));
  } catch {
    // Rules are optional — if embeddings fail, skip
    return [];
  }
}

/**
 * Build the rules injection block for prompts.
 */
export function buildRulesBlock(rules: Rule[]): string {
  if (rules.length === 0) return "";
  return `
=== RÈGLES APPRISES (corrections précédentes) ===
${rules.map((r) => `- ${r.text} (appliquée ${r.appliedCount}x)`).join("\n")}
=== FIN RÈGLES ===

Tu dois appliquer ces règles systématiquement dans ta génération.

`;
}
