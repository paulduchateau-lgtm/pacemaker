import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 05 — mission_visits + briefing cache.
 * Idempotente, additive.
 */

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS mission_visits (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        user_id TEXT NOT NULL DEFAULT 'paul',
        last_visit_at TEXT NOT NULL DEFAULT (datetime('now')),
        briefing_cache TEXT,
        briefing_cache_generated_at TEXT,
        UNIQUE(mission_id, user_id)
      )
    `);
    log.push("OK: mission_visits");

    await execute(
      `CREATE INDEX IF NOT EXISTS idx_mission_visits_mission ON mission_visits(mission_id, last_visit_at)`,
    );
    log.push("OK: idx_mission_visits_mission");

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
