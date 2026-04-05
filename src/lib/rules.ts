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
  limit = 5
): Promise<Rule[]> {
  try {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    const queryText = `${generationType} ${contextStr}`;
    const queryEmbedding = await getEmbedding(queryText, "query");
    const embeddingBlob = `[${queryEmbedding.join(",")}]`;

    const rows = await query(
      `SELECT id, rule_learned, generation_type, applied_count, created_at,
              vector_distance_cos(rule_embedding, vector(?)) as distance
       FROM corrections
       WHERE generation_type = ? AND status = 'active'
       ORDER BY distance ASC
       LIMIT ?`,
      [embeddingBlob, generationType, limit]
    );

    return rows
      .filter((r) => (1 - (r.distance as number)) > 0.65)
      .map((r) => ({
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
