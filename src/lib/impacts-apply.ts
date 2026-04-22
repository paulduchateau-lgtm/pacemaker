/**
 * applyImpact — dispatch central du lot B arbitrage.
 * Délègue la mutation réelle aux handlers (impacts-apply-handlers.ts),
 * puis crée l'agent_action et met à jour le statut du plan_impact.
 */
import { execute, query } from "@/lib/db";
import { getImpactById } from "@/lib/impacts";
import type { PlanImpact } from "@/types";
import {
  newApplyId, iv,
  applyTask, applyIteration, applyLivrable,
} from "@/lib/impacts-apply-handlers";
import {
  applyDecision, applyRisk, applyMilestone, applySuccessCriterion, applyPhase,
} from "@/lib/impacts-apply-plan";

type Row = Record<string, unknown>;

function mapActionType(
  targetType: PlanImpact["target_type"],
  changeType: PlanImpact["change_type"],
): string {
  if (targetType === "task" && changeType === "add") return "create_task";
  if (targetType === "task") return "update_task";
  if (targetType === "iteration" || targetType === "livrable") return "update_deliverable";
  if (targetType === "decision") return "create_decision";
  if (targetType === "phase" || targetType === "milestone" || targetType === "success_criterion") {
    return "recalibrate_plan";
  }
  return "noop"; // risk : pas de create_risk dans le CHECK de agent_actions
}

const SUPPORTED: Record<string, string[]> = {
  task: ["add", "modify", "remove"],
  iteration: ["add", "modify", "remove"],
  livrable: ["add", "modify"],
  milestone: ["add", "modify", "reclassify"],
  success_criterion: ["add", "modify", "remove"],
  phase: ["modify"],
  decision: ["add", "modify"],
  risk: ["add", "modify", "reclassify"],
};

export async function applyImpact(
  impactId: string,
  userId: string,
): Promise<{ agentActionId: string; entityId: string }> {
  const impact = await getImpactById(impactId);
  if (!impact) throw new Error(`Impact introuvable: ${impactId}`);

  if (!SUPPORTED[impact.target_type]?.includes(impact.change_type)) {
    throw new Error(`Combinaison non supportee: target_type=${impact.target_type}, change_type=${impact.change_type}`);
  }

  const after = impact.diff_after ? JSON.parse(impact.diff_after) as Record<string, unknown> : {};
  let entityId = "";

  if (impact.target_type === "task") entityId = await applyTask(impact, after);
  else if (impact.target_type === "iteration") entityId = await applyIteration(impact, after);
  else if (impact.target_type === "livrable") entityId = await applyLivrable(impact, after);
  else if (impact.target_type === "decision") entityId = await applyDecision(impact, after);
  else if (impact.target_type === "risk") entityId = await applyRisk(impact, after);
  else if (impact.target_type === "milestone") entityId = await applyMilestone(impact, after);
  else if (impact.target_type === "success_criterion") entityId = await applySuccessCriterion(impact, after);
  else if (impact.target_type === "phase") entityId = await applyPhase(impact, after);

  const agentActionId = newApplyId("aa");
  await execute(
    `INSERT INTO agent_actions
       (id, mission_id, action_type, target_entity_type, target_entity_id,
        narrative, reasoning, before_state, after_state, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      agentActionId, impact.mission_id,
      mapActionType(impact.target_type, impact.change_type),
      impact.target_type, entityId,
      `Impact ${impact.change_type} ${impact.target_type} applique (lot B arbitrage)`,
      iv(impact.rationale), iv(impact.diff_before), iv(impact.diff_after),
      impact.confidence ?? null,
    ],
  );

  await execute(
    `UPDATE plan_impacts SET status = 'accepted', decided_at = datetime('now'), decided_by = ?, agent_action_id = ? WHERE id = ?`,
    [userId, agentActionId, impactId],
  );

  return { agentActionId, entityId };
}

/** Accepte tous les impacts pending d'un intake dans l'ordre (order_index ASC). */
export async function applyAllImpactsForIntake(
  intakeId: string,
  userId: string,
): Promise<{ accepted: number; failed: number }> {
  const rows = await query(
    "SELECT id FROM plan_impacts WHERE intake_id = ? AND status IN ('proposed','modified') ORDER BY order_index",
    [intakeId],
  ) as Row[];
  let accepted = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await applyImpact(String(row.id), userId);
      accepted++;
    } catch {
      failed++;
    }
  }
  return { accepted, failed };
}
