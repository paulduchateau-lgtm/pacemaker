/**
 * Migration lot A — DDL : création des tables phases/milestones/success_criteria/
 * deliverable_iterations + colonnes additives sur weeks/livrables/tasks.
 * Idempotent (IF NOT EXISTS + colonnes ignorées si déjà présentes).
 *
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/migrate-lot-a-ddl.ts
 */
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");

  const db = createClient({ url, authToken: authToken ?? "" });

  const statements = [
    `CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL REFERENCES missions(id),
      order_index INTEGER NOT NULL,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#A5D900',
      start_date TEXT,
      end_date TEXT,
      actual_start_date TEXT,
      actual_end_date TEXT,
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
      target_date TEXT,
      actual_date TEXT,
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
      target_value TEXT,
      current_value TEXT,
      status TEXT NOT NULL DEFAULT 'not_evaluated'
        CHECK(status IN ('not_evaluated','met','not_met','partially_met')),
      last_assessed_at TEXT,
      notes TEXT,
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
      target_date TEXT,
      actual_delivery_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(deliverable_id, order_index)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_iterations_deliverable ON deliverable_iterations(deliverable_id, order_index)`,
    `CREATE INDEX IF NOT EXISTS idx_iterations_phase ON deliverable_iterations(phase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_iterations_mission ON deliverable_iterations(mission_id)`,
  ];

  // ALTER TABLE statements (ignorées si colonne déjà présente)
  const alters = [
    `ALTER TABLE weeks ADD COLUMN phase_id TEXT REFERENCES phases(id)`,
    `ALTER TABLE livrables ADD COLUMN primary_phase_id TEXT REFERENCES phases(id)`,
    `ALTER TABLE livrables ADD COLUMN type TEXT NOT NULL DEFAULT 'intermediate' CHECK(type IN ('phase','intermediate','continuous'))`,
    `ALTER TABLE tasks ADD COLUMN iteration_id TEXT REFERENCES deliverable_iterations(id)`,
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_weeks_phase ON weeks(phase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_livrables_phase ON livrables(primary_phase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_iteration ON tasks(iteration_id)`,
  ];

  // CREATE TABLE / INDEX
  for (const sql of statements) {
    await db.execute({ sql, args: [] });
    const name = sql.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(\S+)/i)?.[1] ?? "?";
    console.log("OK", name);
  }

  // ALTER TABLE (idempotent via try/catch)
  for (const sql of alters) {
    try {
      await db.execute({ sql, args: [] });
      const col = sql.match(/ADD COLUMN\s+(\S+)/i)?.[1] ?? "?";
      console.log("OK ALTER", col);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
        const col = sql.match(/ADD COLUMN\s+(\S+)/i)?.[1] ?? "?";
        console.log("SKIP (déjà présent)", col);
      } else {
        throw e;
      }
    }
  }

  // INDEX additionnels
  for (const sql of indexes) {
    await db.execute({ sql, args: [] });
    const name = sql.match(/INDEX\s+(?:IF NOT EXISTS\s+)?(\S+)/i)?.[1] ?? "?";
    console.log("OK", name);
  }

  console.log("\nDDL lot A appliqué avec succès.");
}

main().catch((e) => { console.error(e); process.exit(1); });
