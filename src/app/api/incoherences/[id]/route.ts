import { NextRequest, NextResponse } from "next/server";
import { setResolutionStatus } from "@/lib/incoherences";
import type { IncoherenceResolutionStatus } from "@/lib/incoherences";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ALLOWED: IncoherenceResolutionStatus[] = [
  "pending",
  "auto_resolved",
  "user_acknowledged",
  "user_rejected",
  "ignored",
];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const { status, resolvedBy } = await req.json();
    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { error: "Status invalide" },
        { status: 400 },
      );
    }
    await setResolutionStatus(mission.id, id, status, resolvedBy ?? "paul");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
