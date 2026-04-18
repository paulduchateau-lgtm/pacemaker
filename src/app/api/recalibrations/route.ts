import { NextRequest, NextResponse } from "next/server";
import { listRecalibrations } from "@/lib/recalibration";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const recalibrations = await listRecalibrations(mission.id, limit);
  return NextResponse.json({ recalibrations });
}
