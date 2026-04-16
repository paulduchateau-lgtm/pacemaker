import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildCreateLivrablePrompt } from "@/lib/prompts";
import type { Week, Task, Risk, Budget } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { taskId, livrable } = await req.json();
    const { titre, description, format } = livrable;

    const taskRows = await query("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (taskRows.length === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    const t = taskRows[0];
    const task: Task = {
      id: t.id as string,
      weekId: t.week_id as number,
      label: t.label as string,
      description: (t.description as string) || "",
      owner: t.owner as Task["owner"],
      priority: t.priority as Task["priority"],
      status: t.status as Task["status"],
      source: t.source as Task["source"],
      createdAt: t.created_at as string,
      completedAt: (t.completed_at as string) || null,
    };

    const weekRows = await query("SELECT * FROM weeks WHERE id = ?", [task.weekId]);
    const w = weekRows[0];
    const week: Week = {
      id: w.id as number,
      phase: w.phase as Week["phase"],
      title: w.title as string,
      budget_jh: w.budget_jh as number,
      actions: JSON.parse(w.actions as string),
      livrables: JSON.parse(w.livrables_plan as string),
      owner: w.owner as string,
      startDate: (w.start_date as string) || null,
      endDate: (w.end_date as string) || null,
      baselineStartDate: (w.baseline_start_date as string) || null,
      baselineEndDate: (w.baseline_end_date as string) || null,
    };

    const allTasks = (await query("SELECT * FROM tasks")).map((r) => ({
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
    }));

    const riskRows = await query("SELECT * FROM risks");
    const risks: Risk[] = riskRows.map((r) => ({
      id: r.id as string,
      label: r.label as string,
      impact: r.impact as number,
      probability: r.probability as number,
      status: r.status as Risk["status"],
      mitigation: r.mitigation as string,
    }));

    const budgetRow = await query("SELECT value FROM project WHERE key = 'budget'");
    const budget: Budget = budgetRow.length
      ? JSON.parse(budgetRow[0].value as string)
      : { vendu_jh: 0, reel_cible_jh: 0, forfait_ht: 0, tjm_affiche: 0, tjm_reel_cible: 0, echeances: [] };

    const cwRow = await query("SELECT value FROM project WHERE key = 'current_week'");
    const currentWeek = cwRow.length ? parseInt(cwRow[0].value as string) : 1;

    const { getRelevantContext } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(`${titre} ${description} ${task.label}`);
    const rules = await getRelevantRules("livrables", {
      weekId: week.id,
      taskLabel: task.label,
    });
    const missionContext = await getMissionContext();

    const prompt = buildCreateLivrablePrompt(
      { titre, description, format },
      task,
      week,
      { weeks: [], tasks: allTasks, risks, budget, currentWeek },
      ragContext,
      rules,
      missionContext
    );

    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
