import { query } from "../db";
import type { Budget, Risk, Task, Week } from "@/types";

export interface CreateLivrableCtx {
  task: Task;
  week: Week;
  allWeeks: Week[];
  allTasks: Task[];
  risks: Risk[];
  budget: Budget;
  currentWeek: number;
}

function mapWeek(r: Record<string, unknown>): Week {
  return {
    id: r.id as number,
    phase: r.phase as Week["phase"],
    title: r.title as string,
    budget_jh: r.budget_jh as number,
    actions: JSON.parse(r.actions as string),
    livrables: JSON.parse(r.livrables_plan as string),
    owner: r.owner as string,
    startDate: (r.start_date as string) || null,
    endDate: (r.end_date as string) || null,
    baselineStartDate: (r.baseline_start_date as string) || null,
    baselineEndDate: (r.baseline_end_date as string) || null,
  };
}

function mapTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    weekId: r.week_id as number,
    label: r.label as string,
    description: (r.description as string) || "",
    owner: r.owner as Task["owner"],
    priority: r.priority as Task["priority"],
    status: r.status as Task["status"],
    source: r.source as Task["source"],
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) || null,
  };
}

/**
 * Charge tout le contexte mission nécessaire pour générer/régénérer un livrable.
 * Retourne null si taskId introuvable dans la mission indiquée.
 */
export async function loadLivrableContext(
  taskId: string,
  missionId: string,
): Promise<CreateLivrableCtx | null> {
  const taskRows = await query(
    "SELECT * FROM tasks WHERE id = ? AND mission_id = ?",
    [taskId, missionId],
  );
  if (taskRows.length === 0) return null;
  const task = mapTask(taskRows[0]);

  const weekRows = await query(
    "SELECT * FROM weeks WHERE id = ? AND mission_id = ?",
    [task.weekId, missionId],
  );
  if (weekRows.length === 0) return null;
  const week = mapWeek(weekRows[0]);

  const allWeeks: Week[] = (
    await query("SELECT * FROM weeks WHERE mission_id = ? ORDER BY id", [
      missionId,
    ])
  ).map(mapWeek);
  const allTasks: Task[] = (
    await query("SELECT * FROM tasks WHERE mission_id = ?", [missionId])
  ).map(mapTask);
  const riskRows = await query("SELECT * FROM risks WHERE mission_id = ?", [
    missionId,
  ]);
  const risks: Risk[] = riskRows.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    impact: r.impact as number,
    probability: r.probability as number,
    status: r.status as Risk["status"],
    mitigation: r.mitigation as string,
  }));

  // Budget et current_week restent globaux pour l'instant (non scopés par
  // mission au chantier 1 — project k/v non migrée).
  const budgetRow = await query(
    "SELECT value FROM project WHERE key = 'budget'",
  );
  const budget: Budget = budgetRow.length
    ? JSON.parse(budgetRow[0].value as string)
    : {
        vendu_jh: 0,
        reel_cible_jh: 0,
        forfait_ht: 0,
        tjm_affiche: 0,
        tjm_reel_cible: 0,
        echeances: [],
      };

  const cwRow = await query(
    "SELECT value FROM project WHERE key = 'current_week'",
  );
  const currentWeek = cwRow.length ? parseInt(cwRow[0].value as string) : 1;

  return { task, week, allWeeks, allTasks, risks, budget, currentWeek };
}
