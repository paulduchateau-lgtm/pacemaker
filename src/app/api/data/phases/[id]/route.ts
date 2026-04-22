import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { getPhaseById, updatePhase, archivePhase } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const phase = await getPhaseById(params.id, mission.id);
  if (!phase) return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
  return NextResponse.json(phase);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const updated = await updatePhase(params.id, mission.id, body);
  if (!updated) return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  await archivePhase(params.id, mission.id);
  return NextResponse.json({ ok: true });
}
