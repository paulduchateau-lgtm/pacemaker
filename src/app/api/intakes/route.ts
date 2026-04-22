import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { listIntakesForMission, createIntake } from "@/lib/intakes";
import type { IntakeStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const status = req.nextUrl.searchParams.get("status") as IntakeStatus | null;
  const items = await listIntakesForMission(mission.id, status ?? undefined);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  if (!body.source_type) {
    return NextResponse.json({ error: "source_type requis" }, { status: 400 });
  }
  const intake = await createIntake(mission.id, {
    source_type: body.source_type,
    raw_content_excerpt: body.raw_content_excerpt ?? undefined,
    source_ref: body.source_ref ?? undefined,
    document_id: body.document_id ?? undefined,
  });
  return NextResponse.json({ intake }, { status: 201 });
}
