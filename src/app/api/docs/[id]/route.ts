import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    "SELECT * FROM documents WHERE id = ? AND mission_id = ? LIMIT 1",
    [params.id, mission.id],
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = rows[0];
  return NextResponse.json({
    id: r.id, title: r.title, type: r.type, source: r.source,
    blobUrl: r.blob_url, content: r.content, createdAt: r.created_at,
    status: r.status ?? "active",
  });
}

/** PATCH body : { status: 'active' | 'obsolete' } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  const body = await req.json() as { status?: string };
  const validStatuses = ["active", "obsolete"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "status invalide (active | obsolete)" }, { status: 400 });
  }
  await execute(
    "UPDATE documents SET status = ? WHERE id = ? AND mission_id = ?",
    [body.status, params.id, mission.id],
  );
  return NextResponse.json({ ok: true, status: body.status });
}

/** DELETE — supprime le document et ses chunks RAG */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const mission = await resolveActiveMission(req);
  // Vérifie appartenance à la mission
  const rows = await query(
    "SELECT id FROM documents WHERE id = ? AND mission_id = ? LIMIT 1",
    [params.id, mission.id],
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Supprime chunks d'abord (FK)
  await execute("DELETE FROM doc_chunks WHERE doc_id = ?", [params.id]);
  await execute("DELETE FROM documents WHERE id = ? AND mission_id = ?", [params.id, mission.id]);
  return NextResponse.json({ ok: true });
}
