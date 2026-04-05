import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { put, del } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const taskId = formData.get("taskId") as string;
  const file = formData.get("file") as File;

  if (!taskId || !file) {
    return NextResponse.json(
      { error: "taskId et file requis" },
      { status: 400 }
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10 Mo)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`pacemaker/tasks/${taskId}/${file.name}`, buffer, {
    access: "public",
    contentType: file.type || "application/octet-stream",
  });

  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO task_attachments (id, task_id, filename, blob_url, content_type)
     VALUES (?, ?, ?, ?, ?)`,
    [id, taskId, file.name, blob.url, file.type || "application/octet-stream"]
  );

  return NextResponse.json({
    id,
    taskId,
    filename: file.name,
    blobUrl: blob.url,
    contentType: file.type,
    createdAt: new Date().toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const rows = await query(
    "SELECT blob_url FROM task_attachments WHERE id = ?",
    [id]
  );
  if (rows.length > 0) {
    try {
      await del(rows[0].blob_url as string);
    } catch {
      // blob may already be deleted
    }
    await execute("DELETE FROM task_attachments WHERE id = ?", [id]);
  }

  return NextResponse.json({ ok: true });
}
