import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query(
    `SELECT id, week_id, label, description, owner, priority, status, source,
            jh_estime, livrables_generes, created_at, completed_at
     FROM tasks ORDER BY week_id, created_at`
  );
  const tasks = rows.map((r) => ({
    id: r.id,
    weekId: r.week_id,
    label: r.label,
    description: r.description || "",
    owner: r.owner,
    priority: r.priority,
    status: r.status,
    source: r.source,
    jhEstime: r.jh_estime,
    livrables_generes: r.livrables_generes || null,
    createdAt: r.created_at,
    completedAt: r.completed_at || null,
  }));

  // Fetch attachments for all tasks
  const attachRows = await query(
    "SELECT id, task_id, filename, blob_url, content_type, created_at FROM task_attachments ORDER BY created_at"
  );
  const attachMap: Record<string, typeof attachRows> = {};
  for (const a of attachRows) {
    const tid = a.task_id as string;
    if (!attachMap[tid]) attachMap[tid] = [];
    attachMap[tid].push(a);
  }

  const tasksWithAttach = tasks.map((t) => ({
    ...t,
    attachments: (attachMap[t.id as string] || []).map((a) => ({
      id: a.id,
      taskId: a.task_id,
      filename: a.filename,
      blobUrl: a.blob_url,
      contentType: a.content_type,
      createdAt: a.created_at,
    })),
  }));

  return NextResponse.json(tasksWithAttach);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO tasks (id, week_id, label, description, owner, priority, status, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.weekId,
      body.label,
      body.description || "",
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
    description: r.description || "",
    owner: r.owner,
    priority: r.priority,
    status: r.status,
    source: r.source,
    livrables_generes: r.livrables_generes || null,
    createdAt: r.created_at,
    completedAt: r.completed_at || null,
    attachments: [],
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, description, livrables_generes, completed_at } = body;

  const updates: string[] = [];
  const args: unknown[] = [];

  if (status !== undefined) {
    updates.push("status = ?");
    args.push(status);
    // Auto-set completed_at when status → "fait" (unless explicitly provided)
    if (status === "fait" && completed_at === undefined) {
      updates.push("completed_at = ?");
      args.push(new Date().toISOString().split("T")[0]);
    }
    // Clear completed_at if status moves away from "fait"
    if (status !== "fait" && completed_at === undefined) {
      updates.push("completed_at = ?");
      args.push(null);
    }
  }
  if (completed_at !== undefined) {
    updates.push("completed_at = ?");
    args.push(completed_at);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    args.push(description);
  }
  if (livrables_generes !== undefined) {
    updates.push("livrables_generes = ?");
    args.push(livrables_generes);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  args.push(id);
  await execute(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, args as import("@libsql/client").InValue[]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await execute("DELETE FROM task_attachments WHERE task_id = ?", [id]);
  await execute("DELETE FROM tasks WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
