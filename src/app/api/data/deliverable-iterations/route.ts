import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import {
  listIterationsForDeliverable,
  listIterationsForPhase,
  createIteration,
} from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const deliverableId = req.nextUrl.searchParams.get("deliverable_id");
  const phaseId = req.nextUrl.searchParams.get("phase_id");
  if (deliverableId) {
    return NextResponse.json(await listIterationsForDeliverable(deliverableId));
  }
  if (phaseId) {
    return NextResponse.json(await listIterationsForPhase(phaseId, mission.id));
  }
  return NextResponse.json(
    { error: "deliverable_id ou phase_id requis" },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  if (!body.deliverableId || !body.phaseId || body.orderIndex === undefined) {
    return NextResponse.json(
      { error: "deliverableId, phaseId et orderIndex requis" },
      { status: 400 },
    );
  }
  const iter = await createIteration(mission.id, {
    deliverableId: String(body.deliverableId),
    phaseId: String(body.phaseId),
    orderIndex: Number(body.orderIndex),
    labelSuffix: body.labelSuffix ?? null,
    targetMilestoneId: body.targetMilestoneId ?? null,
    targetDate: body.targetDate ?? null,
    notes: body.notes ?? null,
  });
  return NextResponse.json(iter, { status: 201 });
}
