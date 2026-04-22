/**
 * Handlers lot B — mutations decision, risk, milestone, success_criterion, phase.
 */
import { execute } from "@/lib/db";
import type { InValue } from "@libsql/client";
import type { PlanImpact } from "@/types";
import { newApplyId, iv } from "@/lib/impacts-apply-handlers";

export async function applyDecision(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("dec");
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

export async function applyRisk(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("risk");
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

export async function applyMilestone(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("ms");
    await execute(
      `INSERT INTO milestones (id, mission_id, phase_id, label, target_date, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, impact.mission_id, String(after.phase_id ?? ""),
       String(after.label ?? ""), iv(after.target_date), iv(after.description)],
    );
    return id;
  }
  if (!impact.target_id) throw new Error("target_id requis pour modify milestone");
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

export async function applySuccessCriterion(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("crit");
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
  if (!impact.target_id) throw new Error("target_id requis pour modify success_criterion");
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

export async function applyPhase(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (!impact.target_id) throw new Error("target_id requis pour modify phase");
  const sets = ["updated_at = datetime('now')"];
  const args: InValue[] = [];
  if (after.status) { sets.push("status = ?"); args.push(String(after.status)); }
  if ("start_date" in after) { sets.push("start_date = ?"); args.push(iv(after.start_date)); }
  if ("end_date" in after) { sets.push("end_date = ?"); args.push(iv(after.end_date)); }
  args.push(impact.target_id, impact.mission_id);
  await execute(`UPDATE phases SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`, args);
  return impact.target_id;
}
