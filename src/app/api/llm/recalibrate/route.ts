import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import {
  performRecalibration,
  type RecalibScope,
} from "@/lib/recalibration";

export const dynamic = "force-dynamic";

const SCOPES: RecalibScope[] = ["full_plan", "downstream_only", "single_week"];

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = await req.json();
    const currentWeek =
      typeof body.currentWeek === "number" ? body.currentWeek : 1;
    const scope: RecalibScope = SCOPES.includes(body.scope)
      ? (body.scope as RecalibScope)
      : "full_plan";

    const result = await performRecalibration({
      missionId: mission.id,
      currentWeek,
      scope,
      trigger: "manual",
    });

    return NextResponse.json({
      ok: true,
      recalibrationId: result.recalibrationId,
      notes: result.carryoverNotes,
      tasksAdded: result.tasksAdded,
      tasksRemoved: result.tasksRemoved,
      generationId: result.generationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
