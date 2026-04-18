import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM schedule_changes WHERE mission_id = ? ORDER BY created_at DESC",
    [mission.id],
  );
  const changes = rows.map((r) => ({
    id: r.id,
    weekId: r.week_id,
    field: r.field,
    oldValue: r.old_value,
    newValue: r.new_value,
    changeType: r.change_type,
    cascaded: r.cascaded === 1,
    reason: r.reason,
    createdAt: r.created_at,
  }));
  return NextResponse.json(changes);
}
