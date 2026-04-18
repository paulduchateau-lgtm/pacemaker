import { NextRequest, NextResponse } from "next/server";
import {
  getMissionContext,
  setMissionContext,
  DEFAULT_MISSION_CONTEXT,
} from "@/lib/mission-context";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const value = await getMissionContext({ missionId: mission.id });
  return NextResponse.json({ value, default: DEFAULT_MISSION_CONTEXT });
}

export async function PATCH(req: NextRequest) {
  const { value } = await req.json();
  if (typeof value !== "string") {
    return NextResponse.json(
      { error: "value doit être une chaîne" },
      { status: 400 }
    );
  }
  const mission = await resolveActiveMission(req);
  await setMissionContext(mission.id, value);
  return NextResponse.json({ ok: true });
}
