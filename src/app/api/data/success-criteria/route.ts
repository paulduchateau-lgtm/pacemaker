import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { listCriteriaForMilestone, createCriterion } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await resolveActiveMission(req);
  const milestoneId = req.nextUrl.searchParams.get("milestone_id");
  if (!milestoneId) {
    return NextResponse.json({ error: "milestone_id requis" }, { status: 400 });
  }
  const criteria = await listCriteriaForMilestone(milestoneId);
  return NextResponse.json(criteria);
}

export async function POST(req: NextRequest) {
  await resolveActiveMission(req);
  const body = await req.json();
  if (!body.milestoneId || !body.label) {
    return NextResponse.json({ error: "milestoneId et label requis" }, { status: 400 });
  }
  const sc = await createCriterion(
    String(body.milestoneId),
    String(body.label),
    body.orderIndex ?? 0,
  );
  return NextResponse.json(sc, { status: 201 });
}
