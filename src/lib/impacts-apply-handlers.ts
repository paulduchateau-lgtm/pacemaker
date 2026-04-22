/**
 * Handlers lot B — mutations task, iteration, livrable.
 * Ré-exporte aussi les utilitaires partagés (newApplyId, iv).
 */
import { execute } from "@/lib/db";
import type { InValue } from "@libsql/client";
import type { PlanImpact } from "@/types";

export function newApplyId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function iv(v: unknown): InValue {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v as InValue;
  return String(v);
}

export async function applyTask(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("task");
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

export async function applyIteration(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("iter");
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

export async function applyLivrable(impact: PlanImpact, after: Record<string, unknown>): Promise<string> {
  if (impact.change_type === "add") {
    const id = newApplyId("livrable");
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
