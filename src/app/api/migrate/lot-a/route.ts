import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration lot A — DDL (phases, milestones, success_criteria, deliverable_iterations)
 * + colonnes additives sur weeks, livrables, tasks. Idempotente.
 *
 * Appel : POST /api/migrate/lot-a
 */
const CREATES = [
  `CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions(id),
    order_index INTEGER NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#A5D900',
    start_date TEXT, end_date TEXT,
    actual_start_date TEXT, actual_end_date TEXT,
    status TEXT NOT NULL DEFAULT 'not_started'
      CHECK(status IN ('not_started','in_progress','completed','compromised')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(mission_id, order_index)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_phases_mission ON phases(mission_id, order_index)`,
  `CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions(id),
    phase_id TEXT NOT NULL REFERENCES phases(id),
    label TEXT NOT NULL,
    target_date TEXT, actual_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','reached','missed','postponed')),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_milestones_mission ON milestones(mission_id, target_date)`,
  `CREATE INDEX IF NOT EXISTS idx_milestones_phase ON milestones(phase_id)`,
  `CREATE TABLE IF NOT EXISTS success_criteria (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'binary'
      CHECK(assessment_type IN ('binary','qualitative','quantitative')),
    target_value TEXT, current_value TEXT,
    status TEXT NOT NULL DEFAULT 'not_evaluated'
      CHECK(status IN ('not_evaluated','met','not_met','partially_met')),
    last_assessed_at TEXT, notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_success_criteria_milestone ON success_criteria(milestone_id)`,
  `CREATE TABLE IF NOT EXISTS deliverable_iterations (
    id TEXT PRIMARY KEY,
    deliverable_id TEXT NOT NULL REFERENCES livrables(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL REFERENCES missions(id),
    phase_id TEXT NOT NULL REFERENCES phases(id),
    order_index INTEGER NOT NULL,
    label_suffix TEXT,
    target_milestone_id TEXT REFERENCES milestones(id),
    status TEXT NOT NULL DEFAULT 'planned'
      CHECK(status IN ('planned','in_progress','blocked','delivered','validated')),
    target_date TEXT, actual_delivery_date TEXT, notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(deliverable_id, order_index)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_iterations_deliverable ON deliverable_iterations(deliverable_id, order_index)`,
  `CREATE INDEX IF NOT EXISTS idx_iterations_phase ON deliverable_iterations(phase_id)`,
  `CREATE INDEX IF NOT EXISTS idx_iterations_mission ON deliverable_iterations(mission_id)`,
];

const ALTERS = [
  `ALTER TABLE weeks ADD COLUMN phase_id TEXT REFERENCES phases(id)`,
  `ALTER TABLE livrables ADD COLUMN primary_phase_id TEXT REFERENCES phases(id)`,
  `ALTER TABLE livrables ADD COLUMN type TEXT NOT NULL DEFAULT 'intermediate' CHECK(type IN ('phase','intermediate','continuous'))`,
  `ALTER TABLE tasks ADD COLUMN iteration_id TEXT REFERENCES deliverable_iterations(id)`,
];

const ALTER_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_weeks_phase ON weeks(phase_id)`,
  `CREATE INDEX IF NOT EXISTS idx_livrables_phase ON livrables(primary_phase_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_iteration ON tasks(iteration_id)`,
];

export async function POST() {
  const log: string[] = [];
  try {
    for (const sql of CREATES) {
      await execute(sql);
      log.push("OK " + sql.slice(0, 55).replace(/\s+/g, " ").trim() + "...");
    }
    for (const sql of ALTERS) {
      try {
        await execute(sql);
        log.push("OK ALTER " + sql.match(/ADD COLUMN\s+(\S+)/i)?.[1]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already")) {
          log.push("SKIP " + sql.match(/ADD COLUMN\s+(\S+)/i)?.[1] + " (déjà présente)");
        } else throw e;
      }
    }
    for (const sql of ALTER_INDEXES) {
      await execute(sql);
      log.push("OK " + sql.match(/INDEX\s+IF NOT EXISTS\s+(\S+)/i)?.[1]);
    }
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
