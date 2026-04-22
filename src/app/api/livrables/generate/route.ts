import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { generateAndPersistLivrables } from "@/lib/livrables-generation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { taskId } = await req.json();
    if (!taskId) return NextResponse.json({ error: "taskId requis" }, { status: 400 });

    const result = await generateAndPersistLivrables({
      taskId,
      missionId: mission.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
