import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processCorrection } from "@/lib/corrections";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { generationId, correctedOutput } = await req.json();
    if (!generationId || !correctedOutput) {
      return NextResponse.json(
        { error: "generationId et correctedOutput requis" },
        { status: 400 },
      );
    }
    // La mission d'attache est dérivée automatiquement de la génération source
    // (processCorrection lit generations.mission_id et le réutilise sur la
    // correction). On résout quand même la mission active pour vérifier que
    // la correction porte bien sur la mission courante.
    const mission = await resolveActiveMission(req);
    const genRows = await query(
      "SELECT mission_id, generation_type FROM generations WHERE id = ?",
      [generationId],
    );
    if (
      genRows.length === 0 ||
      (genRows[0].mission_id && genRows[0].mission_id !== mission.id)
    ) {
      return NextResponse.json(
        { error: "Génération d'une autre mission" },
        { status: 403 },
      );
    }

    const result = await processCorrection(generationId, correctedOutput);
    // Chantier 8 : une correction sur génération 'livrables' paie sur le
    // long terme via la règle apprise — on logue livrable_correction.
    try {
      const genRow = genRows[0];
      if (genRow && String(genRow.generation_type ?? "") === "livrables") {
        const { logTimeSaving } = await import("@/lib/time-savings");
        await logTimeSaving({
          missionId: mission.id,
          activity: "livrable_correction",
          sourceEntityType: "correction",
          sourceEntityId: result.id,
        });
      }
    } catch {
      /* best-effort */
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let sql =
      "SELECT * FROM corrections WHERE status = 'active' AND mission_id = ?";
    const args: string[] = [mission.id];

    if (type) {
      sql += " AND generation_type = ?";
      args.push(type);
    }

    sql += " ORDER BY created_at DESC";

    const rows = await query(sql, args);
    const corrections = rows.map((r) => ({
      id: r.id,
      generationId: r.generation_id,
      correctedOutput: r.corrected_output,
      diffSummary: r.diff_summary,
      ruleLearned: r.rule_learned,
      generationType: r.generation_type,
      appliedCount: r.applied_count,
      status: r.status,
      createdAt: r.created_at,
    }));

    return NextResponse.json(corrections);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
