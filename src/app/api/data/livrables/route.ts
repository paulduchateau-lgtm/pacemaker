import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM livrables WHERE mission_id = ? ORDER BY week_id",
    [mission.id],
  );
  const livrables = rows.map((r) => ({
    id: r.id,
    weekId: r.week_id,
    label: r.label,
    status: r.status,
    deliveryDate: r.delivery_date || null,
  }));
  return NextResponse.json(livrables);
}

export async function PATCH(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const { id, status, deliveryDate } = body;
  if (status !== undefined) {
    await execute(
      "UPDATE livrables SET status = ? WHERE id = ? AND mission_id = ?",
      [status, id, mission.id],
    );
  }
  if (deliveryDate !== undefined) {
    await execute(
      "UPDATE livrables SET delivery_date = ? WHERE id = ? AND mission_id = ?",
      [deliveryDate, id, mission.id],
    );
  }
  return NextResponse.json({ ok: true });
}
