import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { processCorrection } from "@/lib/corrections";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { generationId, correctedOutput } = await req.json();
    if (!generationId || !correctedOutput) {
      return NextResponse.json(
        { error: "generationId et correctedOutput requis" },
        { status: 400 }
      );
    }

    const result = await processCorrection(generationId, correctedOutput);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let sql = "SELECT * FROM corrections WHERE status = 'active'";
    const args: string[] = [];

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
