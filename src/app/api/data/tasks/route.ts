import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    `SELECT id, week_id, label, description, owner, priority, status, source,
            jh_estime, livrables_generes, created_at, completed_at
     FROM tasks WHERE mission_id = ? ORDER BY week_id, created_at`,
    [mission.id],
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

  // Attachments sont transitifs via task_id — on ne refiltre pas par mission
  // ici, la liste des task.id est déjà mission-scoped.
  const ids = tasks.map((t) => t.id as string);
  if (ids.length === 0) return NextResponse.json([]);
  const placeholders = ids.map(() => "?").join(",");
  const attachRows = await query(
    `SELECT id, task_id, filename, blob_url, content_type, created_at
     FROM task_attachments WHERE task_id IN (${placeholders}) ORDER BY created_at`,
    ids,
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
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO tasks (id, week_id, label, description, owner, priority, status, source, mission_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.weekId,
      body.label,
      body.description || "",
      body.owner || "Paul",
      body.priority || "moyenne",
      body.status || "à faire",
      body.source || "manual",
      mission.id,
    ],
  );
  const rows = await query(
    "SELECT * FROM tasks WHERE id = ? AND mission_id = ?",
    [id, mission.id],
  );
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
  const mission = await resolveActiveMission(req);
  const body = await req.json();
  const { id, status, description, livrables_generes, completed_at } = body;

  const updates: string[] = [];
  const args: unknown[] = [];

  if (status !== undefined) {
    updates.push("status = ?");
    args.push(status);
    if (status === "fait" && completed_at === undefined) {
      updates.push("completed_at = ?");
      args.push(new Date().toISOString().split("T")[0]);
    }
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
  args.push(mission.id);
  await execute(
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND mission_id = ?`,
    args as import("@libsql/client").InValue[],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Vérifie que la tâche appartient bien à la mission active avant suppression
  const rows = await query(
    "SELECT id FROM tasks WHERE id = ? AND mission_id = ? LIMIT 1",
    [id, mission.id],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
  }
  await execute("DELETE FROM task_attachments WHERE task_id = ?", [id]);
  await execute("DELETE FROM tasks WHERE id = ? AND mission_id = ?", [
    id,
    mission.id,
  ]);
  return NextResponse.json({ ok: true });
}
