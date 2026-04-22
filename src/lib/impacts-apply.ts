import { execute, query } from "@/lib/db";
import type { InValue } from "@libsql/client";
import { getImpactById } from "@/lib/impacts";
import type { PlanImpact } from "@/types";

type Row = Record<string, unknown>;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Convertit une valeur inconnue en InValue (string | number | null). */
function iv(v: unknown): InValue {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v as InValue;
  return String(v);
}

function mapActionType(
  targetType: PlanImpact["target_type"],
  changeType: PlanImpact["change_type"],
): string {
  if (targetType === "task" && changeType === "add") return "create_task";
  if (targetType === "task") return "update_task";
  if (targetType === "iteration") return "update_deliverable";
  if (targetType === "livrable") return "update_deliverable";
  if (targetType === "decision") return "create_decision";
  if (targetType === "phase" || targetType === "milestone" || targetType === "success_criterion") {
    return "recalibrate_plan";
  }
  // risk n'a pas de create_risk dans le CHECK de agent_actions
  if (targetType === "risk") return "noop";
  return "noop";
}

async function applyTask(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("task");
    await execute(
      `INSERT INTO tasks (id, week_id, label, owner, priority, source, mission_id, confidence)
       VALUES (?, ?, ?, ?, ?, 'agent', ?, ?)`,
      [id, iv(after.week_id ?? after.weekId), String(after.label ?? ""),
       String(after.owner ?? "Paul"), String(after.priority ?? "moyenne"),
       impact.mission_id, impact.confidence ?? null],
    );
    return id;
  }
  if (impact.change_type === "remove") {
    if (impact.target_id) {
      await execute("UPDATE tasks SET status = 'fait' WHERE id = ? AND mission_id = ?", [impact.target_id, impact.mission_id]);
    }
    return impact.target_id ?? "";
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify task");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.label) { sets.push("label = ?"); args.push(String(after.label)); }
  if (after.owner) { sets.push("owner = ?"); args.push(String(after.owner)); }
  if (after.priority) { sets.push("priority = ?"); args.push(String(after.priority)); }
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if (!sets.length) return impact.target_id;
  args.push(impact.target_id, impact.mission_id);
  await execute(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  return impact.target_id;
}

async function applyIteration(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("iter");
    await execute(
      `INSERT INTO deliverable_iterations
         (id, deliverable_id, mission_id, phase_id, order_index, label_suffix, target_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, String(after.deliverable_id ?? after.deliverableId ?? ""), impact.mission_id,
       String(after.phase_id ?? after.phaseId ?? ""), Number(after.order_index ?? 0),
       iv(after.label_suffix), iv(after.target_date), iv(after.notes)],
    );
    return id;
  }
  if (impact.change_type === "remove") {
    if (impact.target_id) {
      await execute("DELETE FROM deliverable_iterations WHERE id = ? AND mission_id = ?", [impact.target_id, impact.mission_id]);
    }
    return impact.target_id ?? "";
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify iteration");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if ("target_date" in after) { sets.push("target_date = ?"); args.push(iv(after.target_date)); }
  if ("notes" in after) { sets.push("notes = ?"); args.push(iv(after.notes)); }
  if (sets.length) {
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE deliverable_iterations SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  }
  return impact.target_id;
}

async function applyLivrable(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("livrable");
    await execute(
      `INSERT INTO livrables (id, week_id, label, status, mission_id) VALUES (?, ?, ?, 'planifie', ?)`,
      [id, iv(after.week_id), String(after.label ?? ""), impact.mission_id],
    );
    return id;
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify livrable");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.label) { sets.push("label = ?"); args.push(String(after.label)); }
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if (sets.length) {
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE livrables SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  }
  return impact.target_id;
}

async function applyDecision(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("dec");
    await execute(
      `INSERT INTO decisions (id, mission_id, statement, rationale, author, confidence, source_type)
       VALUES (?, ?, ?, ?, 'agent', ?, 'agent')`,
      [id, impact.mission_id, String(after.statement ?? after.label ?? ""),
       iv(after.rationale), impact.confidence ?? null],
    );
    return id;
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify decision");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.statement) { sets.push("statement = ?"); args.push(String(after.statement)); }
  if ("rationale" in after) { sets.push("rationale = ?"); args.push(iv(after.rationale)); }
  if (sets.length) {
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE decisions SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  }
  return impact.target_id;
}

async function applyRisk(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("risk");
    await execute(
      `INSERT INTO risks (id, label, impact, probability, mission_id, confidence) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, String(after.label ?? ""), Number(after.impact ?? 3),
       Number(after.probability ?? 3), impact.mission_id, impact.confidence ?? null],
    );
    return id;
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify risk");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.label) { sets.push("label = ?"); args.push(String(after.label)); }
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if (sets.length) {
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE risks SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  }
  return impact.target_id;
}

async function applyMilestone(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("ms");
    await execute(
      `INSERT INTO milestones (id, mission_id, phase_id, label, target_date, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, impact.mission_id, String(after.phase_id ?? ""),
       String(after.label ?? ""), iv(after.target_date), iv(after.description)],
    );
    return id;
  }
  if (!impact.target_id) throw new Error("target_id requis");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.label) { sets.push("label = ?"); args.push(String(after.label)); }
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if (sets.length) {
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE milestones SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  }
  return impact.target_id;
}

async function applySuccessCriterion(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newId("crit");
    await execute(
      `INSERT INTO success_criteria (id, milestone_id, label, assessment_type, order_index) VALUES (?, ?, ?, ?, ?)`,
      [id, String(after.milestone_id ?? ""), String(after.label ?? ""),
       String(after.assessment_type ?? "binary"), Number(after.order_index ?? 0)],
    );
    return id;
  }
  if (impact.change_type === "remove") {
    if (impact.target_id) await execute("DELETE FROM success_criteria WHERE id = ?", [impact.target_id]);
    return impact.target_id ?? "";
  }
  if (!impact.target_id) throw new Error("target_id requis");
  const sets: string[] = [];
  const args: InValue[] = [];
  if (after.label) { sets.push("label = ?"); args.push(String(after.label)); }
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if (sets.length) {
    args.push(impact.target_id);
    await execute(`UPDATE success_criteria SET ${sets.join(", ")} WHERE id = ?`, args);
  }
  return impact.target_id ?? "";
}

export async function applyImpact(
  impactId: string,
  userId: string,
): Promise<{ agentActionId: string; entityId: string }> {
  const impact = await getImpactById(impactId);
  if (!impact) throw new Error(`Impact introuvable: ${impactId}`);

  const after = impact.diff_after ? JSON.parse(impact.diff_after) as Record<string, unknown> : {};
  const supported: Record<string, string[]> = {
    task: ["add", "modify", "remove"],
    iteration: ["add", "modify", "remove"],
    livrable: ["add", "modify"],
    milestone: ["add", "modify", "reclassify"],
    success_criterion: ["add", "modify", "remove"],
    phase: ["modify"],
    decision: ["add", "modify"],
    risk: ["add", "modify", "reclassify"],
  };
  if (!supported[impact.target_type]?.includes(impact.change_type)) {
    throw new Error(`Combinaison non supportee: target_type=${impact.target_type}, change_type=${impact.change_type}`);
  }

  let entityId = "";
  if (impact.target_type === "task") entityId = await applyTask(impact, after);
  else if (impact.target_type === "iteration") entityId = await applyIteration(impact, after);
  else if (impact.target_type === "livrable") entityId = await applyLivrable(impact, after);
  else if (impact.target_type === "decision") entityId = await applyDecision(impact, after);
  else if (impact.target_type === "risk") entityId = await applyRisk(impact, after);
  else if (impact.target_type === "milestone") entityId = await applyMilestone(impact, after);
  else if (impact.target_type === "success_criterion") entityId = await applySuccessCriterion(impact, after);
  else if (impact.target_type === "phase" && impact.change_type === "modify") {
    if (!impact.target_id) throw new Error("target_id requis pour modify phase");
    const sets = ["updated_at = datetime('now')"];
    const args: InValue[] = [];
    if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
    if ("start_date" in after) { sets.push("start_date = ?"); args.push(iv(after.start_date)); }
    if ("end_date" in after) { sets.push("end_date = ?"); args.push(iv(after.end_date)); }
    args.push(impact.target_id, impact.mission_id);
    await execute(`UPDATE phases SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
    entityId = impact.target_id;
  }

  const actionType = mapActionType(impact.target_type, impact.change_type);
  const agentActionId = newId("aa");
  await execute(
    `INSERT INTO agent_actions
       (id, mission_id, action_type, target_entity_type, target_entity_id,
        narrative, reasoning, before_state, after_state, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      agentActionId, impact.mission_id, actionType,
      impact.target_type, entityId,
      `Impact ${impact.change_type} ${impact.target_type} applique (lot B arbitrage)`,
      iv(impact.rationale),
      iv(impact.diff_before),
      iv(impact.diff_after),
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
