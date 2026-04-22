import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { getMilestoneById, updateMilestone, deleteMilestone } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const ms = await getMilestoneById(params.id, mission.id);
  if (!ms) return NextResponse.json({ error: "Jalon introuvable" }, { status: 404 });
  return NextResponse.json(ms);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const updated = await updateMilestone(params.id, mission.id, body);
  if (!updated) return NextResponse.json({ error: "Jalon introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const ms = await getMilestoneById(params.id, mission.id);
  if (!ms) return NextResponse.json({ error: "Jalon introuvable" }, { status: 404 });
  await deleteMilestone(params.id, mission.id);
  return NextResponse.json({ ok: true });
}
