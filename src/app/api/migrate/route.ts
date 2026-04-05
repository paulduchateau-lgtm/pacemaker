import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIGRATIONS = [
  // Apprentissage continu — tables
  `CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY, generation_type TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT '{}', prompt TEXT NOT NULL,
    raw_output TEXT NOT NULL, applied_rules TEXT NOT NULL DEFAULT '[]',
    week_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY, generation_id TEXT NOT NULL REFERENCES generations(id),
    corrected_output TEXT NOT NULL, diff_summary TEXT NOT NULL,
    rule_learned TEXT NOT NULL, rule_embedding F32_BLOB(1024),
    generation_type TEXT NOT NULL,
    applied_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Index
  `CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(generation_type)`,
  `CREATE INDEX IF NOT EXISTS idx_generations_week ON generations(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_corrections_gen_id ON corrections(generation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_corrections_type ON corrections(generation_type, status)`,
  `CREATE INDEX IF NOT EXISTS rules_embedding_idx ON corrections(libsql_vector_idx(rule_embedding))`,
];

export async function POST() {
  const results: string[] = [];
  try {
    for (const sql of MIGRATIONS) {
      await execute(sql);
      const label = sql.slice(0, 60).replace(/\s+/g, " ").trim();
      results.push(`OK: ${label}...`);
    }
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message, results }, { status: 500 });
  }
}
