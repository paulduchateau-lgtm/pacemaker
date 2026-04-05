import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query("SELECT * FROM livrables ORDER BY week_id");
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
  const body = await req.json();
  const { id, status, deliveryDate } = body;
  if (status !== undefined) {
    await execute("UPDATE livrables SET status = ? WHERE id = ?", [status, id]);
  }
  if (deliveryDate !== undefined) {
    await execute("UPDATE livrables SET delivery_date = ? WHERE id = ?", [
      deliveryDate,
      id,
    ]);
  }
  return NextResponse.json({ ok: true });
}
