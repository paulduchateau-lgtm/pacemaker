import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { listMilestonesForMission, createMilestone } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const phaseId = req.nextUrl.searchParams.get("phase_id") ?? undefined;
  const milestones = await listMilestonesForMission(mission.id, phaseId);
  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  if (!body.phaseId || !body.label) {
    return NextResponse.json({ error: "phaseId et label requis" }, { status: 400 });
  }
  const ms = await createMilestone(mission.id, {
    phaseId: String(body.phaseId),
    label: String(body.label),
    targetDate: body.targetDate ?? null,
    description: body.description ?? null,
  });
  return NextResponse.json(ms, { status: 201 });
}
