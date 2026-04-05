import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query("SELECT * FROM risks ORDER BY id");
  const risks = rows.map((r) => ({
    id: r.id,
    label: r.label,
    impact: r.impact,
    probability: r.probability,
    status: r.status,
    mitigation: r.mitigation,
  }));
  return NextResponse.json(risks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    "INSERT INTO risks (id, label, impact, probability, status, mitigation) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      body.label,
      body.impact,
      body.probability,
      body.status || "actif",
      body.mitigation || "",
    ]
  );
  const rows = await query("SELECT * FROM risks WHERE id = ?", [id]);
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    label: r.label,
    impact: r.impact,
    probability: r.probability,
    status: r.status,
    mitigation: r.mitigation,
  });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  await execute("UPDATE risks SET status = ? WHERE id = ?", [status, id]);
  return NextResponse.json({ ok: true });
}
