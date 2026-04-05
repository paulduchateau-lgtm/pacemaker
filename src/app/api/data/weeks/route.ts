import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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
  }));
  return NextResponse.json(weeks);
}
