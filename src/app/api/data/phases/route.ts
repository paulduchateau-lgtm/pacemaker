import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { listPhasesForMission, createPhase } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const phases = await listPhasesForMission(mission.id);
  return NextResponse.json(phases);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  if (!body.label || body.orderIndex === undefined) {
    return NextResponse.json({ error: "label et orderIndex requis" }, { status: 400 });
  }
  const phase = await createPhase(mission.id, {
    orderIndex: Number(body.orderIndex),
    label: String(body.label),
    color: body.color,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
    description: body.description ?? null,
  });
  return NextResponse.json(phase, { status: 201 });
}
