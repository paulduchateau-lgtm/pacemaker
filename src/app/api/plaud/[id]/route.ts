import { NextRequest, NextResponse } from "next/server";
import { getTranscript, listSignalsForTranscript } from "@/lib/plaud";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mission = await resolveActiveMission(req);
  const { id } = await params;
  const transcript = await getTranscript(mission.id, id);
  if (!transcript) {
    return NextResponse.json({ error: "Transcript non trouvé" }, { status: 404 });
  }
  const signals = await listSignalsForTranscript(id);
  return NextResponse.json({ transcript, signals });
}
