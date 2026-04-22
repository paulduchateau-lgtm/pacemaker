import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { indexDocument } from "@/lib/rag";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM documents WHERE mission_id = ? ORDER BY created_at DESC",
    [mission.id],
  );
  const docs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    source: r.source,
    weekId: r.week_id,
    blobUrl: r.blob_url,
    content: r.content,
    createdAt: r.created_at,
    status: r.status ?? "active",
  }));
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = await req.json();
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, blob_url, content, mission_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.title,
        body.type || "autre",
        body.source || "manual",
        body.weekId || null,
        body.blobUrl || null,
        body.content || "",
        mission.id,
      ],
    );

    if (body.content && body.content.trim().length > 0) {
      try {
        await indexDocument(id, body.content);
      } catch {
        // RAG optionnelle
      }
    }

    const rows = await query(
      "SELECT * FROM documents WHERE id = ? AND mission_id = ?",
      [id, mission.id],
    );
    const r = rows[0];
    return NextResponse.json({
      id: r.id,
      title: r.title,
      type: r.type,
      source: r.source,
      weekId: r.week_id,
      blobUrl: r.blob_url,
      content: r.content,
      createdAt: r.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
