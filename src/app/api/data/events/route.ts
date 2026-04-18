import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM events WHERE mission_id = ? ORDER BY date DESC",
    [mission.id],
  );
  const events = rows.map((r) => ({
    id: r.id,
    type: r.type,
    label: r.label,
    weekId: r.week_id,
    date: r.date,
    content: r.content,
  }));
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO events (id, type, label, week_id, content, mission_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, body.type, body.label, body.weekId, body.content || "", mission.id],
  );
  const rows = await query(
    "SELECT * FROM events WHERE id = ? AND mission_id = ?",
    [id, mission.id],
  );
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    type: r.type,
    label: r.label,
    weekId: r.week_id,
    date: r.date,
    content: r.content,
  });
}
