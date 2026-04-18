import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 03 — détection d'incohérences + logging tokens.
 * Idempotente, additive.
 *
 * Tables créées :
 *   - token_usage : télémétrie des appels LLM (input/output tokens par mission)
 *   - incoherences : schéma unifié (cf. plan v0.1.1) compatible avec la spec
 *     WhatsApp du chantier 7 (champ source_message_id optionnel).
 */

const INDEXES: Array<[string, string]> = [
  ["idx_token_usage_mission", "token_usage(mission_id, created_at)"],
  ["idx_token_usage_route", "token_usage(route, created_at)"],
  ["idx_incoherences_mission_pending", "incoherences(mission_id, resolution_status, created_at)"],
  ["idx_incoherences_source", "incoherences(mission_id, source_entity_type, source_entity_id)"],
  ["idx_incoherences_briefed", "incoherences(mission_id, briefed_to_user_at)"],
];

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS token_usage (
        id TEXT PRIMARY KEY,
        mission_id TEXT REFERENCES missions(id),
        generation_id TEXT REFERENCES generations(id),
        route TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens INTEGER,
        cache_read_tokens INTEGER,
        triggered_by TEXT NOT NULL DEFAULT 'user'
          CHECK(triggered_by IN ('user','auto')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: token_usage");

    await execute(`
      CREATE TABLE IF NOT EXISTS incoherences (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        kind TEXT NOT NULL
          CHECK(kind IN ('factual','scope_drift','constraint_change','hypothesis_invalidated')),
        severity TEXT NOT NULL DEFAULT 'moderate'
          CHECK(severity IN ('minor','moderate','major')),
        description TEXT NOT NULL,
        source_entity_type TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        source_message_id TEXT,
        conflicting_entity_type TEXT NOT NULL,
        conflicting_entity_id TEXT NOT NULL,
        auto_resolution TEXT,
        resolution_status TEXT NOT NULL DEFAULT 'pending'
          CHECK(resolution_status IN ('pending','auto_resolved','user_acknowledged','user_rejected','ignored')),
        resolved_at TEXT,
        resolved_by TEXT,
        briefed_to_user_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: incoherences");

    for (const [name, target] of INDEXES) {
      await execute(`CREATE INDEX IF NOT EXISTS ${name} ON ${target}`);
      log.push(`OK: ${name}`);
    }

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
