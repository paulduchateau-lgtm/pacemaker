import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { getPulseData } from "@/lib/pulse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const data = await getPulseData(mission.id);
  return NextResponse.json(data);
}
