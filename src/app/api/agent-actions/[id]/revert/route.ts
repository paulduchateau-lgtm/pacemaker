import { NextRequest, NextResponse } from "next/server";
import { revertAgentAction } from "@/lib/agent-actions";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const mission = await resolveActiveMission(req);
  const { id } = await params;
  const result = await revertAgentAction(mission.id, id);
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json(result);
}
