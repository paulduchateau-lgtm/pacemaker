import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 02 — modèle de décision enrichi.
 * Idempotente. Additive (la table `events` type='decision' n'est PAS purgée,
 * on y laisse les rangées historiques pour ne rien perdre).
 *
 * Cf. docs/reference/pacemaker-plan-transformation.md §Chantier 2.
 */

const INDEXES: Array<[string, string]> = [
  ["idx_decisions_mission", "decisions(mission_id, acted_at)"],
  ["idx_decisions_status", "decisions(mission_id, status)"],
  ["idx_decisions_author", "decisions(mission_id, author)"],
  ["idx_decision_links_decision", "decision_links(decision_id)"],
  ["idx_decision_links_entity", "decision_links(entity_type, entity_id)"],
];

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        statement TEXT NOT NULL,
        rationale TEXT,
        rationale_source TEXT NOT NULL DEFAULT 'native'
          CHECK(rationale_source IN ('native','legacy_no_rationale','user_added_later','llm_inferred')),
        alternatives TEXT,
        author TEXT NOT NULL DEFAULT 'paul',
        confidence REAL,
        status TEXT NOT NULL DEFAULT 'actée'
          CHECK(status IN ('proposée','actée','révisée','annulée')),
        source_type TEXT NOT NULL DEFAULT 'manual'
          CHECK(source_type IN ('manual','parse_cr','vision','agent','legacy_event')),
        source_ref TEXT,
        revised_from TEXT REFERENCES decisions(id),
        week_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        acted_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: table decisions");

    await execute(`
      CREATE TABLE IF NOT EXISTS decision_links (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL
          CHECK(entity_type IN ('task','risk','livrable','week','document')),
        entity_id TEXT NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'impacts'
          CHECK(link_type IN ('impacts','derives_from','blocks','supersedes')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: table decision_links");

    for (const [name, target] of INDEXES) {
      await execute(`CREATE INDEX IF NOT EXISTS ${name} ON ${target}`);
      log.push(`OK: ${name}`);
    }

    // Backfill : chaque event 'decision' qui n'a PAS déjà une decision liée
    // donne lieu à une rangée decisions, avec rationale_source='legacy_no_rationale'.
    const legacyEvents = await query(
      `SELECT id, mission_id, label, content, week_id, date
       FROM events
       WHERE type = 'decision'
         AND mission_id IS NOT NULL
         AND id NOT IN (
           SELECT source_ref FROM decisions
           WHERE source_type = 'legacy_event' AND source_ref IS NOT NULL
         )`,
    );
    let migrated = 0;
    for (const e of legacyEvents) {
      const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${migrated}`;
      await execute(
        `INSERT INTO decisions
           (id, mission_id, statement, rationale, rationale_source, author,
            status, source_type, source_ref, week_id, created_at, acted_at)
         VALUES (?, ?, ?, ?, 'legacy_no_rationale', 'paul', 'actée',
                 'legacy_event', ?, ?, ?, ?)`,
        [
          id,
          e.mission_id as string,
          (e.label as string) || "(décision sans énoncé)",
          (e.content as string | null) || null,
          e.id as string,
          (e.week_id as number | null) ?? null,
          (e.date as string) || new Date().toISOString(),
          (e.date as string) || new Date().toISOString(),
        ],
      );
      migrated++;
    }
    log.push(`OK: ${migrated} legacy 'decision' events backfilled`);

    const total = await query("SELECT COUNT(*) as c FROM decisions");
    return NextResponse.json({
      ok: true,
      totalDecisions: Number(total[0]?.c ?? 0),
      migratedFromEvents: migrated,
      log,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
