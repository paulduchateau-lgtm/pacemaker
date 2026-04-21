import { query, execute } from "./db";
import { callLLMWithUsage, parseJSON } from "./llm";
import { getEmbedding } from "./embeddings";
import { logTokenUsage } from "./token-usage";
import type { GenerationType } from "@/types";

/**
 * Track a LLM generation for future correction.
 * `missionId` est scopant : chaque génération appartient à UNE mission.
 * Si `usage` est fourni, la consommation de tokens est loguée dans
 * `token_usage` pour suivi budgétaire (chantier 3).
 */
export async function trackGeneration(params: {
  generationType: GenerationType;
  context: Record<string, unknown>;
  prompt: string;
  rawOutput: string;
  appliedRuleIds: string[];
  weekId?: number;
  missionId: string;
  usage?: { inputTokens: number; outputTokens: number; cacheCreationTokens?: number; cacheReadTokens?: number };
  model?: string;
  route?: string;
  triggeredBy?: "user" | "auto";
}): Promise<string> {
  const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO generations
       (id, generation_type, context, prompt, raw_output, applied_rules, week_id, mission_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.generationType,
      JSON.stringify(params.context),
      params.prompt,
      params.rawOutput,
      JSON.stringify(params.appliedRuleIds),
      params.weekId ?? null,
      params.missionId,
    ],
  );

  for (const ruleId of params.appliedRuleIds) {
    await execute(
      `UPDATE corrections SET applied_count = applied_count + 1 WHERE id = ?`,
      [ruleId],
    );
  }

  if (params.usage && params.model && params.route) {
    await logTokenUsage({
      missionId: params.missionId,
      generationId: id,
      route: params.route,
      model: params.model,
      usage: params.usage,
      triggeredBy: params.triggeredBy ?? "user",
    });
  }

  return id;
}

/**
 * Process a user correction: extract a rule via LLM, embed it, store it.
 * La correction est attachée à la mission d'origine de la génération.
 */
export async function processCorrection(
  generationId: string,
  correctedOutput: string,
): Promise<{ id: string; ruleLearned: string; diffSummary: string }> {
  const rows = await query(
    "SELECT * FROM generations WHERE id = ?",
    [generationId],
  );
  if (rows.length === 0) throw new Error("Génération non trouvée");
  const gen = rows[0];
  const missionId = (gen.mission_id as string | null) ?? null;

  const analysisPrompt = `Tu analyses la correction d'une génération LLM pour en extraire une règle réutilisable.

CONTEXTE : ${gen.generation_type} (${gen.context})

VERSION GÉNÉRÉE PAR LE LLM :
---
${gen.raw_output}
---

VERSION CORRIGÉE PAR L'UTILISATEUR :
---
${correctedOutput}
---

Produis une analyse en 2 parties :
1. Un résumé court et factuel du diff (ce qui a été ajouté, retiré, reformulé)
2. Une règle généralisable, applicable aux futures générations du même type

La règle doit être :
- Concrète et actionnable ("Toujours inclure X", "Ne jamais utiliser Y")
- Généralisable (pas spécifique à ce contexte précis)
- Courte (1-2 phrases max)

Réponds UNIQUEMENT en JSON sans backticks :
{
  "diff_summary": "...",
  "rule_learned": "..."
}`;

  const { text: result, usage, model } = await callLLMWithUsage(
    analysisPrompt,
    500,
  );

  // Chantier 6 : loguer la consommation de tokens comme les autres call sites.
  if (missionId) {
    await logTokenUsage({
      missionId,
      generationId,
      route: "corrections/extract-rule",
      model,
      usage,
      triggeredBy: "user",
    });
  }

  const { diff_summary, rule_learned } = parseJSON<{
    diff_summary: string;
    rule_learned: string;
  }>(result);

  const embedding = await getEmbedding(rule_learned, "document");
  const embeddingBlob = `[${embedding.join(",")}]`;

  const corrId = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO corrections
       (id, generation_id, corrected_output, diff_summary, rule_learned, rule_embedding, generation_type, mission_id)
     VALUES (?, ?, ?, ?, ?, vector(?), ?, ?)`,
    [
      corrId,
      generationId,
      correctedOutput,
      diff_summary,
      rule_learned,
      embeddingBlob,
      gen.generation_type as string,
      missionId,
    ],
  );

  return { id: corrId, ruleLearned: rule_learned, diffSummary: diff_summary };
}
