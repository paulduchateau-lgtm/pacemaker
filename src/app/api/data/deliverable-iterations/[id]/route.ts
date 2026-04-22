import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { getIterationById, updateIteration, deleteIteration } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await resolveActiveMission(req);
  const iter = await getIterationById(params.id);
  if (!iter) return NextResponse.json({ error: "Iteration introuvable" }, { status: 404 });
  return NextResponse.json(iter);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await resolveActiveMission(req);
  const body = await req.json();
  const updated = await updateIteration(params.id, body);
  if (!updated) return NextResponse.json({ error: "Iteration introuvable" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await resolveActiveMission(req);
  const existing = await getIterationById(params.id);
  if (!existing) return NextResponse.json({ error: "Iteration introuvable" }, { status: 404 });
  await deleteIteration(params.id);
  return NextResponse.json({ ok: true });
}
