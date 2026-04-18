import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 04 — recalibrations + trace de revert.
 * Idempotente, additive.
 */

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS recalibrations (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        trigger TEXT NOT NULL
          CHECK(trigger IN ('manual','auto_on_incoherence','auto_on_input','scheduled')),
        trigger_ref TEXT,
        scope TEXT NOT NULL
          CHECK(scope IN ('full_plan','downstream_only','single_week')),
        changes_summary TEXT,
        snapshot_before TEXT,   -- JSON des tâches supprimées (pour revert)
        inserted_task_ids TEXT, -- JSON [id,...] des tâches créées (pour revert)
        tasks_added INTEGER NOT NULL DEFAULT 0,
        tasks_modified INTEGER NOT NULL DEFAULT 0,
        tasks_removed INTEGER NOT NULL DEFAULT 0,
        current_week INTEGER,
        reasoning TEXT,
        reverted_at TEXT,
        reverted_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: recalibrations");

    await execute(
      `CREATE INDEX IF NOT EXISTS idx_recalibrations_mission ON recalibrations(mission_id, created_at)`,
    );
    await execute(
      `CREATE INDEX IF NOT EXISTS idx_recalibrations_trigger ON recalibrations(mission_id, trigger, created_at)`,
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
