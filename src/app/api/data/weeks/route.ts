import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query("SELECT * FROM weeks ORDER BY id");
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
  const { id, startDate, endDate } = await req.json();
  if (startDate !== undefined) {
    await execute("UPDATE weeks SET start_date = ? WHERE id = ?", [startDate, id]);
  }
  if (endDate !== undefined) {
    await execute("UPDATE weeks SET end_date = ? WHERE id = ?", [endDate, id]);
  }
  return NextResponse.json({ ok: true });
}
