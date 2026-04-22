import type { Task, Risk, Livrable, Phase, PlanPhase, Milestone, SuccessCriterion, DeliverableIteration } from "@/types";
import { PHASE_WEEKS } from "@/config/phases";

export function getWeekTasks(tasks: Task[], weekId: number): Task[] {
  return tasks.filter((t) => t.weekId === weekId);
}

export function getTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "fait").length;
  const blocked = tasks.filter((t) => t.status === "bloqué").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, blocked, pct };
}

export function getAllTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "fait").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

export function getPhaseProgress(tasks: Task[], phase: Phase) {
  const weekIds = PHASE_WEEKS[phase] || [];
  const phaseTasks = tasks.filter((t) => weekIds.includes(t.weekId));
  return getTaskStats(phaseTasks);
}

export function getLivrableStats(livrables: Livrable[]) {
  const total = livrables.length;
  const validated = livrables.filter((l) => l.status === "validé").length;
  const delivered = livrables.filter(
    (l) => l.status === "livré" || l.status === "validé"
  ).length;
  return { total, validated, delivered };
}

export function riskScore(risk: Risk): number {
  return risk.impact * risk.probability;
}

// ─── Fonctions de plan v2 (lot A) ─────────────────────────

export function computePhaseHealth(
  phase: PlanPhase,
  milestones: Milestone[],
  iterations: DeliverableIteration[],
): { pctComplete: number; blockedCount: number; criticalMet: boolean } {
  const total = iterations.length;
  const done = iterations.filter(
    (i) => i.status === "delivered" || i.status === "validated",
  ).length;
  const blocked = iterations.filter((i) => i.status === "blocked").length;
  const ms = milestones.filter((m) => m.phaseId === phase.id);
  const criticalMet = ms.length === 0 || ms.every((m) => m.status === "reached");
  return {
    pctComplete: total === 0 ? 0 : Math.round((done / total) * 100),
    blockedCount: blocked,
    criticalMet,
  };
}

export function computeMilestoneStatus(
  milestone: Milestone,
  criteria: SuccessCriterion[],
): Milestone["status"] {
  if (!criteria.length) return milestone.status;
  const allMet = criteria.every((c) => c.status === "met");
  const anyNotMet = criteria.some((c) => c.status === "not_met");
  if (allMet) return "reached";
  if (anyNotMet) return "missed";
  return milestone.status;
}

export function aggregateDeliverableStatus(
  iterations: DeliverableIteration[],
): "planned" | "in_progress" | "blocked" | "delivered" | "validated" {
  if (!iterations.length) return "planned";
  if (iterations.some((i) => i.status === "blocked")) return "blocked";
  if (iterations.every((i) => i.status === "validated")) return "validated";
  if (iterations.every((i) => i.status === "delivered" || i.status === "validated")) return "delivered";
  if (iterations.some((i) => i.status === "in_progress" || i.status === "delivered")) return "in_progress";
  return "planned";
}
