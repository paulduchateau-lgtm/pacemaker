import { NextRequest, NextResponse } from "next/server";
import { createDecision, listDecisions } from "@/lib/decisions";
import { resolveActiveMission } from "@/lib/mission";
import type { CreateDecisionInput, DecisionStatus } from "@/types";

export const dynamic = "force-dynamic";

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
    const body = (await req.json()) as CreateDecisionInput;
    if (!body.statement) {
      return NextResponse.json(
        { error: "statement obligatoire" },
        { status: 400 },
      );
    }
    const decision = await createDecision(mission.id, body);
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
