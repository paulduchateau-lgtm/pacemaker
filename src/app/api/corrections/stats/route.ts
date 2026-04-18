import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const totalRows = await query(
      "SELECT COUNT(*) as count FROM corrections WHERE status = 'active' AND mission_id = ?",
      [mission.id],
    );
    const total = (totalRows[0]?.count as number) || 0;

    const appRows = await query(
      "SELECT COALESCE(SUM(applied_count), 0) as total FROM corrections WHERE status = 'active' AND mission_id = ?",
      [mission.id],
    );
    const applications = (appRows[0]?.total as number) || 0;

    return NextResponse.json({ total, applications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
