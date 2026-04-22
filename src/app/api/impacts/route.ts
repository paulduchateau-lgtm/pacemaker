import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { listPendingImpactsForMission, countPendingImpacts, createImpact } from "@/lib/impacts";
import type { PlanImpactStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const sp = req.nextUrl.searchParams;

  // ?count=1 => retourne juste le compteur (pour badge sidebar)
  if (sp.get("count") === "1") {
    const n = await countPendingImpacts(mission.id);
    return NextResponse.json({ count: n });
  }

  const statusParam = sp.get("status");
  if (statusParam) {
    const statuses = statusParam.split(",") as PlanImpactStatus[];
    const impacts = await listPendingImpactsForMission(mission.id, statuses);
    return NextResponse.json(impacts);
  }

  const impacts = await listPendingImpactsForMission(mission.id);
  return NextResponse.json(impacts);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  if (!body.target_type || !body.change_type) {
    return NextResponse.json({ error: "target_type et change_type requis" }, { status: 400 });
  }
  const impact = await createImpact(mission.id, {
    intake_id: body.intake_id ?? undefined,
    generation_id: body.generation_id ?? undefined,
    target_type: body.target_type,
    target_id: body.target_id ?? undefined,
    change_type: body.change_type,
    diff_before: body.diff_before ?? undefined,
    diff_after: body.diff_after ?? undefined,
    rationale: body.rationale ?? undefined,
    confidence: body.confidence ?? undefined,
    severity: body.severity ?? undefined,
    order_index: body.order_index ?? undefined,
  });
  return NextResponse.json({ impact }, { status: 201 });
}
