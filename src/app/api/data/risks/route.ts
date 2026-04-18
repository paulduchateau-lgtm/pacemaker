import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM risks WHERE mission_id = ? ORDER BY id",
    [mission.id],
  );
  const risks = rows.map((r) => ({
    id: r.id,
    label: r.label,
    impact: r.impact,
    probability: r.probability,
    status: r.status,
    mitigation: r.mitigation,
    confidence: (r.confidence as number | null) ?? null,
    reasoning: (r.reasoning as string | null) ?? null,
  }));
  return NextResponse.json(risks);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO risks (id, label, impact, probability, status, mitigation, mission_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.label,
      body.impact,
      body.probability,
      body.status || "actif",
      body.mitigation || "",
      mission.id,
    ],
  );
  const rows = await query(
    "SELECT * FROM risks WHERE id = ? AND mission_id = ?",
    [id, mission.id],
  );
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
  const mission = await resolveActiveMission(req);
  const { id, status } = await req.json();
  await execute(
    "UPDATE risks SET status = ? WHERE id = ? AND mission_id = ?",
    [status, id, mission.id],
  );
  return NextResponse.json({ ok: true });
}
