import { NextRequest, NextResponse } from "next/server";
import { searchDocs } from "@/lib/rag";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  try {
    const mission = await resolveActiveMission(req);
    const results = await searchDocs(q.trim(), 5, mission.id);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
