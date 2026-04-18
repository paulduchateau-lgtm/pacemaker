import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildRecalibrationPrompt } from "@/lib/prompts";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";
import type { Week, Task, Risk, MissionEvent } from "@/types";

export const dynamic = "force-dynamic";

interface RecalibResult {
  weeks: Record<string, { label: string; owner: string; priority: string }[]>;
  carryover_notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { currentWeek } = await req.json();

    const weekRows = await query(
      "SELECT * FROM weeks WHERE mission_id = ? ORDER BY id",
      [mission.id],
    );
    const weeks: Week[] = weekRows.map((w) => ({
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
    }));

    const taskRows = await query(
      "SELECT * FROM tasks WHERE mission_id = ?",
      [mission.id],
    );
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
      completedAt: (r.completed_at as string) || null,
    }));

    const riskRows = await query(
      "SELECT * FROM risks WHERE mission_id = ?",
      [mission.id],
    );
    const risks: Risk[] = riskRows.map((r) => ({
      id: r.id as string,
      label: r.label as string,
      impact: r.impact as number,
      probability: r.probability as number,
      status: r.status as Risk["status"],
      mitigation: r.mitigation as string,
    }));

    const eventRows = await query(
      "SELECT * FROM events WHERE mission_id = ? ORDER BY date DESC",
      [mission.id],
    );
    const events: MissionEvent[] = eventRows.map((r) => ({
      id: r.id as string,
      type: r.type as MissionEvent["type"],
      label: r.label as string,
      weekId: r.week_id as number,
      date: r.date as string,
      content: r.content as string,
    }));

    const { getRelevantContext } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { trackGeneration } = await import("@/lib/corrections");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(
      `recalibration semaine ${currentWeek}`,
      { missionId: mission.id },
    );
    const rules = await getRelevantRules(
      "recalib",
      { currentWeek },
      { missionId: mission.id },
    );
    const missionContext = await getMissionContext({ missionId: mission.id });
    const prompt = buildRecalibrationPrompt(
      { currentWeek, weeks, tasks, risks, events },
      ragContext,
      rules,
      missionContext,
    );
    const result = await callLLM(prompt, 4000);

    const generationId = await trackGeneration({
      generationType: "recalib",
      context: { currentWeek },
      prompt,
      rawOutput: result,
      appliedRuleIds: rules.map((r) => r.id),
      weekId: currentWeek,
      missionId: mission.id,
    });

    const recalib = parseJSON<RecalibResult>(result);

    await execute(
      "DELETE FROM tasks WHERE week_id >= ? AND status != 'fait' AND mission_id = ?",
      [currentWeek, mission.id],
    );

    for (const [weekIdStr, weekTasks] of Object.entries(recalib.weeks)) {
      const weekId = parseInt(weekIdStr, 10);
      for (const t of weekTasks) {
        const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await execute(
          "INSERT INTO tasks (id, week_id, label, owner, priority, source, mission_id) VALUES (?, ?, ?, ?, ?, 'recalib', ?)",
          [id, weekId, t.label, t.owner, t.priority, mission.id],
        );
      }
    }

    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'recalib', ?, ?, ?, ?)",
      [
        evtId,
        `Recalibration du plan à S${currentWeek}`,
        currentWeek,
        recalib.carryover_notes,
        mission.id,
      ],
    );

    return NextResponse.json({
      ok: true,
      notes: recalib.carryover_notes,
      generationId,
      rawOutput: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
