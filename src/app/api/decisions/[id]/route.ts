import { NextRequest, NextResponse } from "next/server";
import {
  cancelDecision,
  getDecisionById,
  reviseDecision,
  updateDecision,
} from "@/lib/decisions";
import { resolveActiveMission } from "@/lib/mission";
import type { CreateDecisionInput, UpdateDecisionInput } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const mission = await resolveActiveMission(req);
  const { id } = await params;
  const decision = await getDecisionById(mission.id, id);
  if (!decision) {
    return NextResponse.json(
      { error: "Décision introuvable" },
      { status: 404 },
    );
  }
  return NextResponse.json({ decision });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const body = await req.json();
    // Si body.revise === true : on révise (crée une nouvelle décision liée)
    if (body.revise === true) {
      const input = body.replacement as CreateDecisionInput;
      if (!input?.statement) {
        return NextResponse.json(
          { error: "replacement.statement requis pour la révision" },
          { status: 400 },
        );
      }
      const replacement = await reviseDecision(mission.id, id, input);
      return NextResponse.json({ decision: replacement });
    }
    const patch = body as UpdateDecisionInput;
    const updated = await updateDecision(mission.id, id, patch);
    return NextResponse.json({ decision: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const mission = await resolveActiveMission(req);
    const { id } = await params;
    const cancelled = await cancelDecision(mission.id, id);
    return NextResponse.json({ decision: cancelled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
