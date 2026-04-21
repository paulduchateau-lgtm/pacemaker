import { NextRequest, NextResponse } from "next/server";
import { resolveActiveMission } from "@/lib/mission";
import { query } from "@/lib/db";
import { searchDocs } from "@/lib/rag";

export const dynamic = "force-dynamic";

/**
 * Citations RAG pour un livrable : top N chunks de la mission dont la
 * similarité est la plus haute avec le label du livrable. Sert à montrer
 * dans l'éditeur quelles sources Pacemaker pourrait réinjecter pour
 * étayer/compléter la rédaction.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const mission = await resolveActiveMission(req);
  const rows = await query(
    `SELECT id, label, week_id FROM livrables WHERE id = ? AND mission_id = ? LIMIT 1`,
    [params.id, mission.id],
  );
  const liv = rows[0];
  if (!liv) {
    return NextResponse.json({ error: "Livrable introuvable" }, { status: 404 });
  }

  const label = String(liv.label ?? "");
  if (!label) {
    return NextResponse.json({ livrable: liv, citations: [] });
  }

  // Top 8 chunks, seuil large (0.75) pour ne pas retourner vide si le label
  // est court. La UI affichera la similarité pour filtrer à l'œil.
  const results = await searchDocs(label, 8, mission.id).catch(() => []);
  const citations = results
    .filter((r) => r.distance <= 0.85)
    .map((r) => ({
      chunkId: r.chunkId,
      docId: r.docId,
      docTitle: r.docTitle,
      content: r.content.length > 400 ? r.content.slice(0, 400) + "…" : r.content,
      similarity: Math.round((1 - r.distance) * 100) / 100,
    }));

  return NextResponse.json({
    livrable: {
      id: String(liv.id),
      label,
      weekId: (liv.week_id as number | null) ?? null,
    },
    citations,
  });
}
