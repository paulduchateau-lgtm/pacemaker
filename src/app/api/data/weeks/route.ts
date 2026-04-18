import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM weeks WHERE mission_id = ? ORDER BY id",
    [mission.id],
  );
  const weeks = rows.map((r) => ({
    id: r.id,
    phase: r.phase,
    title: r.title,
    budget_jh: r.budget_jh,
    actions: JSON.parse(r.actions as string),
    livrables: JSON.parse(r.livrables_plan as string),
    owner: r.owner,
    startDate: r.start_date || null,
    endDate: r.end_date || null,
    baselineStartDate: r.baseline_start_date || null,
    baselineEndDate: r.baseline_end_date || null,
  }));
  return NextResponse.json(weeks);
}

export async function PATCH(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const { id, startDate, endDate } = await req.json();
  if (startDate !== undefined) {
    await execute(
      "UPDATE weeks SET start_date = ? WHERE id = ? AND mission_id = ?",
      [startDate, id, mission.id],
    );
  }
  if (endDate !== undefined) {
    await execute(
      "UPDATE weeks SET end_date = ? WHERE id = ? AND mission_id = ?",
      [endDate, id, mission.id],
    );
  }
  return NextResponse.json({ ok: true });
}
