import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";

export const dynamic = "force-dynamic";
import { buildGenerateTasksPrompt } from "@/lib/prompts";
import { query, execute } from "@/lib/db";
import type { Week, Task } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { weekId } = await req.json();

    const weekRows = await query("SELECT * FROM weeks WHERE id = ?", [weekId]);
    if (weekRows.length === 0) {
      return NextResponse.json({ error: "Semaine non trouvée" }, { status: 404 });
    }

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

    const taskRows = await query("SELECT * FROM tasks WHERE week_id = ?", [weekId]);
    const existingTasks = taskRows.map(mapTask);

    const prevRows = weekId > 1
      ? await query("SELECT * FROM tasks WHERE week_id = ?", [weekId - 1])
      : [];
    const prevWeekTasks = prevRows.map(mapTask);

    const { getRelevantContext } = await import("@/lib/rag");
    const ragContext = await getRelevantContext(
      `${week.title} ${week.phase} ${week.actions.join(" ")}`,
      weekId
    );
    const prompt = buildGenerateTasksPrompt(week, existingTasks, prevWeekTasks, ragContext);
    const result = await callLLM(prompt, 2000);
    const generated = parseJSON<{ label: string; owner: string; priority: string }[]>(result);

    const created: Task[] = [];
    for (const g of generated) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO tasks (id, week_id, label, owner, priority, source) VALUES (?, ?, ?, ?, ?, 'llm')",
        [id, weekId, g.label, g.owner, g.priority]
      );
      const rows = await query("SELECT * FROM tasks WHERE id = ?", [id]);
      created.push(mapTask(rows[0]));
    }

    return NextResponse.json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
