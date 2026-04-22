import { NextRequest, NextResponse } from "next/server";
import { applyAllImpactsForIntake } from "@/lib/impacts-apply";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.intake_id) {
    return NextResponse.json({ error: "intake_id requis" }, { status: 400 });
  }
  const userId = (body as Record<string, unknown>).user_id as string ?? "paul";
  const result = await applyAllImpactsForIntake(body.intake_id, userId);
  return NextResponse.json(result);
}
