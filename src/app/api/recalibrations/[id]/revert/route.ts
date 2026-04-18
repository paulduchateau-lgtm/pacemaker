import { NextRequest, NextResponse } from "next/server";
import { revertRecalibration } from "@/lib/recalibration";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const result = await revertRecalibration(mission.id, id, "paul");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
