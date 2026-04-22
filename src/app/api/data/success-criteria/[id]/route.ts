import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { assessCriterion, getCriterionById } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await resolveActiveMission(req);
  const sc = await getCriterionById(params.id);
  if (!sc) return NextResponse.json({ error: "Critere introuvable" }, { status: 404 });
  return NextResponse.json(sc);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await resolveActiveMission(req);
  const body = await req.json();
  if (!body.status) {
    return NextResponse.json({ error: "status requis" }, { status: 400 });
  }
  const updated = await assessCriterion(params.id, {
    status: body.status,
    currentValue: body.currentValue,
    notes: body.notes,
  });
  if (!updated) return NextResponse.json({ error: "Critere introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}
