import { NextRequest, NextResponse } from "next/server";
import { createDecision, listDecisions } from "@/lib/decisions";
import { resolveActiveMission } from "@/lib/mission";
import { kickOffAutoRecalibration } from "@/lib/recalibration";
import type { CreateDecisionInput, DecisionStatus } from "@/types";

export const dynamic = "force-dynamic";
// Une création de décision déclenche une recalibration SYNCHRONE (l'UI
// affiche "RECALIBRATION EN COURS (20-30s)"). On autorise 60s max côté
// Vercel pour couvrir un appel LLM long.
export const maxDuration = 60;

const ALL_STATUSES: DecisionStatus[] = [
  "proposée",
  "actée",
  "révisée",
  "annulée",
];

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const weekParam = url.searchParams.get("weekId");
  const statuses = statusParam
    ? (statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is DecisionStatus =>
          (ALL_STATUSES as string[]).includes(s),
        ) as DecisionStatus[])
    : undefined;
  const weekId = weekParam ? parseInt(weekParam, 10) : undefined;
  const decisions = await listDecisions(mission.id, { statuses, weekId });
  return NextResponse.json({ decisions });
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = (await req.json()) as CreateDecisionInput & {
      skipRecalibration?: boolean;
    };
    if (!body.statement) {
      return NextResponse.json(
        { error: "statement obligatoire" },
        { status: 400 },
      );
    }

    // createDecision ne déclenche plus elle-même la recalibration :
    // on la fait EXPLICITEMENT ici en synchrone pour que le form ait le
    // temps d'afficher "RECALIBRATION EN COURS" puis rafraîchisse la page
    // avec le plan à jour.
    const decision = await createDecision(mission.id, body, {
      skipAutoRecalibration: true,
    });

    let recalibrationId: string | undefined;
    if (!body.skipRecalibration) {
      const res = await kickOffAutoRecalibration({
        missionId: mission.id,
        scope: "full_plan",
        trigger: "auto_on_input",
        triggerRef: decision.id,
        wait: true,
      });
      recalibrationId = res.recalibrationId;
    }

    return NextResponse.json(
      { decision, recalibrationId },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[api/decisions POST] failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
