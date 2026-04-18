import { NextRequest, NextResponse } from "next/server";
import { createMission, listMissions } from "@/lib/mission";
import type { CreateMissionInput, MissionStatus } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: MissionStatus[] = ["active", "paused", "archived"];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status"); // comma-separated
  const statuses = statusParam
    ? (statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is MissionStatus =>
          (ALLOWED_STATUSES as string[]).includes(s),
        ) as MissionStatus[])
    : undefined;
  const missions = await listMissions({ statuses });
  return NextResponse.json({ missions });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateMissionInput>;
    if (!body.slug || !body.label || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Champs obligatoires : slug, label, startDate, endDate" },
        { status: 400 },
      );
    }
    const mission = await createMission(body as CreateMissionInput);
    return NextResponse.json({ mission }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
