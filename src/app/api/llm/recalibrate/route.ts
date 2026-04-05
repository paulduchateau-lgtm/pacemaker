import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";

export const dynamic = "force-dynamic";
import { buildRecalibrationPrompt } from "@/lib/prompts";
import { query, execute } from "@/lib/db";
import type { Week, Task, Risk, MissionEvent } from "@/types";

interface RecalibResult {
  weeks: Record<string, { label: string; owner: string; priority: string }[]>;
  carryover_notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const { currentWeek } = await req.json();

    // Fetch full state
    const weekRows = await query("SELECT * FROM weeks ORDER BY id");
    const weeks: Week[] = weekRows.map((w) => ({
      id: w.id as number,
      phase: w.phase as Week["phase"],
      title: w.title as string,
      budget_jh: w.budget_jh as number,
      actions: JSON.parse(w.actions as string),
      livrables: JSON.parse(w.livrables_plan as string),
      owner: w.owner as string,
    }));

    const taskRows = await query("SELECT * FROM tasks");
    const tasks: Task[] = taskRows.map((r) => ({
      id: r.id as string,
      weekId: r.week_id as number,
      label: r.label as string,
      description: (r.description as string) || "",
      owner: r.owner as Task["owner"],
      priority: r.priority as Task["priority"],
      status: r.status as Task["status"],
      source: r.source as Task["source"],
      createdAt: r.created_at as string,
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

    const eventRows = await query("SELECT * FROM events ORDER BY date DESC");
    const events: MissionEvent[] = eventRows.map((r) => ({
      id: r.id as string,
      type: r.type as MissionEvent["type"],
      label: r.label as string,
      weekId: r.week_id as number,
      date: r.date as string,
      content: r.content as string,
    }));

    const { getRelevantContext } = await import("@/lib/rag");
    const ragContext = await getRelevantContext(
      `recalibration semaine ${currentWeek} mission BI Power BI Agirc-Arrco`
    );
    const prompt = buildRecalibrationPrompt({
      currentWeek,
      weeks,
      tasks,
      risks,
      events,
    }, ragContext);
    const result = await callLLM(prompt, 4000);
    const recalib = parseJSON<RecalibResult>(result);

    // Delete non-done tasks for weeks >= currentWeek
    await execute(
      "DELETE FROM tasks WHERE week_id >= ? AND status != 'fait'",
      [currentWeek]
    );

    // Insert recalibrated tasks
    for (const [weekIdStr, weekTasks] of Object.entries(recalib.weeks)) {
      const weekId = parseInt(weekIdStr, 10);
      for (const t of weekTasks) {
        const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await execute(
          "INSERT INTO tasks (id, week_id, label, owner, priority, source) VALUES (?, ?, ?, ?, ?, 'recalib')",
          [id, weekId, t.label, t.owner, t.priority]
        );
      }
    }

    // Log recalibration event
    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      "INSERT INTO events (id, type, label, week_id, content) VALUES (?, 'recalib', ?, ?, ?)",
      [
        evtId,
        `Recalibration du plan à S${currentWeek}`,
        currentWeek,
        recalib.carryover_notes,
      ]
    );

    return NextResponse.json({
      ok: true,
      notes: recalib.carryover_notes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
