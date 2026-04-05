import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query("SELECT * FROM events ORDER BY date DESC");
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
  const body = await req.json();
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    "INSERT INTO events (id, type, label, week_id, content) VALUES (?, ?, ?, ?, ?)",
    [id, body.type, body.label, body.weekId, body.content || ""]
  );
  const rows = await query("SELECT * FROM events WHERE id = ?", [id]);
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
