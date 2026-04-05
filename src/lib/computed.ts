import type { Task, Risk, Livrable, Phase } from "@/types";
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
