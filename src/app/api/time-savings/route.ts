import { NextRequest, NextResponse } from "next/server";
import { aggregateTimeSavings } from "@/lib/time-savings";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "mission";
  const daysMap: Record<string, number> = {
    week: 7,
    month: 30,
    mission: 0, // 0 = depuis le début
  };
  const sinceDays = daysMap[period] ?? 0;
  const agg = await aggregateTimeSavings({
    missionId: mission.id,
    sinceDays,
  });
  return NextResponse.json({ ...agg, period });
}
