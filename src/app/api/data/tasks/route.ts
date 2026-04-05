import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query(
    "SELECT id, week_id, label, owner, priority, status, source, created_at FROM tasks ORDER BY week_id, created_at"
  );
  const tasks = rows.map((r) => ({
    id: r.id,
    weekId: r.week_id,
    label: r.label,
    owner: r.owner,
    priority: r.priority,
    status: r.status,
    source: r.source,
    createdAt: r.created_at,
  }));
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    "INSERT INTO tasks (id, week_id, label, owner, priority, status, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      body.weekId,
      body.label,
      body.owner || "Paul",
      body.priority || "moyenne",
      body.status || "à faire",
      body.source || "manual",
    ]
  );
  const rows = await query("SELECT * FROM tasks WHERE id = ?", [id]);
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    weekId: r.week_id,
    label: r.label,
    owner: r.owner,
    priority: r.priority,
    status: r.status,
    source: r.source,
    createdAt: r.created_at,
  });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  await execute("UPDATE tasks SET status = ? WHERE id = ?", [status, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await execute("DELETE FROM tasks WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
