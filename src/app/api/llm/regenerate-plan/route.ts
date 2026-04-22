import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { regeneratePlan } from "@/lib/regenerate-plan";

export const dynamic = "force-dynamic";

/**
 * POST /api/llm/regenerate-plan
 * Efface tasks/livrables/iterations de la mission et régénère un plan par phases via Claude.
 * Opération longue (~30-60s). Retourne { tasks, livrables }.
 */
export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const result = await regeneratePlan(mission.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
