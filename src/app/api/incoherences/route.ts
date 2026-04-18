import { NextRequest, NextResponse } from "next/server";
import { listIncoherences, markBriefedToUser } from "@/lib/incoherences";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const url = new URL(req.url);
  const pending = url.searchParams.get("pending") === "true";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const rows = await listIncoherences(mission.id, {
    pendingOnly: pending,
    limit,
  });
  // Marque comme briefé si `brief=true` (le client confirme qu'il les a vues)
  if (url.searchParams.get("brief") === "true" && rows.length > 0) {
    await markBriefedToUser(rows.map((r) => r.id));
  }
  return NextResponse.json({ incoherences: rows });
}
