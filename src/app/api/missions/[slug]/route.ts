import { NextRequest, NextResponse } from "next/server";
import {
  archiveMission,
  getMissionBySlug,
  updateMission,
} from "@/lib/mission";
import type { UpdateMissionInput } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const mission = await getMissionBySlug(params.slug);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  }
  return NextResponse.json({ mission });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const mission = await getMissionBySlug(params.slug);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  }
  try {
    const patch = (await req.json()) as UpdateMissionInput;
    const updated = await updateMission(mission.id, patch);
    return NextResponse.json({ mission: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  // Soft delete : passe status à 'archived', ne supprime aucune donnée liée.
  const mission = await getMissionBySlug(params.slug);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  }
  const archived = await archiveMission(mission.id);
  return NextResponse.json({ mission: archived });
}
