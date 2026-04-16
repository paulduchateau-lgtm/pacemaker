import { NextRequest, NextResponse } from "next/server";
import {
  getMissionContext,
  setMissionContext,
  DEFAULT_MISSION_CONTEXT,
} from "@/lib/mission-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const value = await getMissionContext();
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
  await setMissionContext(value);
  return NextResponse.json({ ok: true });
}
