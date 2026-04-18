import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 08 — time_savings.
 * Idempotente, additive. Les médianes de `time-conversion.ts` ont été
 * validées par Paul (cf. docs/design/time-conversion-ranges.md).
 */

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS time_savings (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        user_id TEXT NOT NULL DEFAULT 'paul',
        activity_type TEXT NOT NULL,
        estimated_minutes_saved INTEGER NOT NULL,
        source_entity_type TEXT,
        source_entity_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: time_savings");

    await execute(
      `CREATE INDEX IF NOT EXISTS idx_time_savings_mission ON time_savings(mission_id, created_at)`,
    );
    await execute(
      `CREATE INDEX IF NOT EXISTS idx_time_savings_activity ON time_savings(mission_id, activity_type)`,
    );
    log.push("OK: indexes");

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
