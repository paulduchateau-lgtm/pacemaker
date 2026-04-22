import { randomUUID } from "crypto";
import { callLLMCached, parseJSON } from "@/lib/llm";
import { query, execute } from "@/lib/db";
import { buildGenerateLivrablesPrompt } from "@/lib/prompts";
import { getRelevantContext } from "@/lib/rag";
import { getRelevantRules } from "@/lib/rules";
import { trackGeneration } from "@/lib/corrections";
import { getMissionContext } from "@/lib/mission-context";

interface LivrableProposal {
  titre: string;
  description: string;
  format: string;
}

interface LivrableResult {
  livrables: LivrableProposal[];
  plan_action: string;
}

export interface GeneratedLivrable {
  id: string;
  label: string;
  format: string;
  status: string;
  weekId: number;
  sourceTaskId: string;
  reasoning: string | null;
}

/**
 * Génère des livrables LLM à partir d'une tâche et les persiste en rows
 * dans la table `livrables` avec `source_task_id = taskId`.
 * Remplit aussi `tasks.livrables_generes` (JSON) pour compat descendante.
 */
export async function generateAndPersistLivrables(params: {
  taskId: string;
  missionId: string;
}): Promise<{ livrables: GeneratedLivrable[]; generationId: string; planAction: string }> {
  const { taskId, missionId } = params;

  const taskRows = await query("SELECT * FROM tasks WHERE id = ? AND mission_id = ?", [taskId, missionId]);
  if (taskRows.length === 0) throw new Error("Tâche non trouvée");
  const task = taskRows[0];

  const weekRows = await query("SELECT * FROM weeks WHERE id = ? AND mission_id = ?", [task.week_id, missionId]);
  if (weekRows.length === 0) throw new Error("Semaine introuvable");
  const week = weekRows[0];

  const ragContext = await getRelevantContext(
    `${task.label} ${task.description || ""}`,
    { weekId: task.week_id as number, missionId },
  );

  const rules = await getRelevantRules(
    "livrables",
    { weekId: week.id as number, taskLabel: task.label as string },
    { missionId },
  );
  const missionContext = await getMissionContext({ missionId });

  const existingRows = await query(
    "SELECT livrables_generes FROM tasks WHERE id != ? AND mission_id = ? AND livrables_generes IS NOT NULL",
    [taskId, missionId],
  );
  const existingLabels: string[] = [];
  for (const r of existingRows) {
    try {
      const p = JSON.parse(r.livrables_generes as string) as LivrableResult;
      for (const l of p.livrables ?? []) if (l.titre) existingLabels.push(l.titre);
    } catch { /* skip */ }
  }

  const { system, user } = buildGenerateLivrablesPrompt(
    {
      label: task.label as string,
      description: (task.description as string) || "",
      owner: task.owner as string,
      priority: task.priority as string,
    },
    { phase: week.phase as string, title: week.title as string, weekId: week.id as number },
    ragContext,
    rules,
    existingLabels,
    missionContext,
  );

  const { text, usage, model } = await callLLMCached(system, user, 2000);
  const parsed = parseJSON<LivrableResult>(text);

  const generationId = await trackGeneration({
    generationType: "livrables",
    context: { taskId, weekId: week.id as number },
    prompt: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`,
    rawOutput: text,
    appliedRuleIds: rules.map((r) => r.id),
    weekId: week.id as number,
    missionId,
    usage,
    model,
    route: "livrables/generate-from-task",
    triggeredBy: "user",
  });

  await execute("UPDATE tasks SET livrables_generes = ? WHERE id = ? AND mission_id = ?", [
    JSON.stringify(parsed), taskId, missionId,
  ]);

  const inserted: GeneratedLivrable[] = [];
  for (const p of parsed.livrables ?? []) {
    const id = `liv-${randomUUID().slice(0, 12)}`;
    await execute(
      `INSERT INTO livrables (id, week_id, label, status, mission_id, source_task_id, format, reasoning)
       VALUES (?, ?, ?, 'planifié', ?, ?, ?, ?)`,
      [id, week.id as number, p.titre, missionId, taskId, p.format || "DOC", p.description || null],
    );
    inserted.push({
      id,
      label: p.titre,
      format: p.format || "DOC",
      status: "planifié",
      weekId: week.id as number,
      sourceTaskId: taskId,
      reasoning: p.description || null,
    });
  }

  return { livrables: inserted, generationId, planAction: parsed.plan_action ?? "" };
}
