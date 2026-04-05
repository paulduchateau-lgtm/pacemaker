import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let sql = "SELECT * FROM generations";
    const args: (string | number)[] = [];

    if (type) {
      sql += " WHERE generation_type = ?";
      args.push(type);
    }

    sql += " ORDER BY created_at DESC LIMIT ?";
    args.push(limit);

    const rows = await query(sql, args);
    const generations = rows.map((r) => ({
      id: r.id,
      generationType: r.generation_type,
      context: JSON.parse(r.context as string),
      rawOutput: r.raw_output,
      appliedRules: JSON.parse(r.applied_rules as string),
      weekId: r.week_id,
      createdAt: r.created_at,
    }));

    return NextResponse.json(generations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
