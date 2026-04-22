import { NextRequest, NextResponse } from "next/server";
import { getIntakeById, archiveIntake } from "@/lib/intakes";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const intake = await getIntakeById(params.id);
  if (!intake) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(intake);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await archiveIntake(params.id);
  return NextResponse.json({ ok: true });
}
