import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getMissionContext } from "@/lib/mission-context";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 01 — Entité Mission multi-tenant.
 * Idempotente : peut être rejouée sans effet de bord.
 * Cf. docs/reference/pacemaker-plan-transformation.md §Chantier 1.
 */

const MISSION_ID = "mission-agirc-arrco-2026";
const MISSION_SLUG = "agirc-arrco-2026";
const MISSION_LABEL = "Agirc-Arrco — DAS Power BI";
const MISSION_CLIENT = "Agirc-Arrco";
const MISSION_THEME = "agirc-arrco";
const DEFAULT_START_DATE = "2026-04-16";

const TABLES_TO_SCOPE = [
  "weeks",
  "tasks",
  "risks",
  "livrables",
  "rapports",
  "events",
  "documents",
  "generations",
  "corrections",
  "schedule_changes",
] as const;

const COMPOSITE_INDEXES: Array<[string, string]> = [
  ["idx_weeks_mission", "weeks(mission_id)"],
  ["idx_tasks_mission_week", "tasks(mission_id, week_id)"],
  ["idx_risks_mission", "risks(mission_id)"],
  ["idx_livrables_mission_week", "livrables(mission_id, week_id)"],
  ["idx_rapports_mission", "rapports(mission_id)"],
  ["idx_events_mission_date", "events(mission_id, date)"],
  ["idx_documents_mission", "documents(mission_id)"],
  ["idx_generations_mission", "generations(mission_id, created_at)"],
  ["idx_corrections_mission", "corrections(mission_id, generation_type)"],
  ["idx_schedule_changes_mission", "schedule_changes(mission_id, week_id)"],
];

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await query(`PRAGMA table_info(${table})`);
  return rows.some((r) => (r as unknown as { name: string }).name === column);
}

function addWeeksIso(iso: string, weeks: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const log: string[] = [];
  try {
    // 1) Table missions + index de statut
    await execute(`
      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        client TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
        theme TEXT NOT NULL DEFAULT 'liteops',
        context TEXT,
        owner_user_id TEXT NOT NULL DEFAULT 'paul',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await execute(
      `CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status, owner_user_id)`,
    );
    log.push("OK: table missions + idx_missions_status");

    // 2) Seed mission agirc-arrco-2026 (si absente)
    const sdRows = await query(
      "SELECT value FROM project WHERE key = 'mission_start_date'",
    );
    const startDate =
      (sdRows[0]?.value as string | undefined)?.trim() || DEFAULT_START_DATE;
    const endDate = addWeeksIso(startDate, 7);
    const context = await getMissionContext();
    const insertResult = await execute(
      `INSERT OR IGNORE INTO missions
         (id, slug, label, client, start_date, end_date, theme, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        MISSION_ID,
        MISSION_SLUG,
        MISSION_LABEL,
        MISSION_CLIENT,
        startDate,
        endDate,
        MISSION_THEME,
        context,
      ],
    );
    log.push(
      insertResult.rowsAffected > 0
        ? `OK: mission ${MISSION_SLUG} seeded (${startDate} → ${endDate})`
        : `skip: mission ${MISSION_SLUG} already present`,
    );

    // 3) Ajout de mission_id sur chaque table à scoper
    for (const t of TABLES_TO_SCOPE) {
      if (await hasColumn(t, "mission_id")) {
        log.push(`skip: ${t}.mission_id already present`);
        continue;
      }
      await execute(
        `ALTER TABLE ${t} ADD COLUMN mission_id TEXT REFERENCES missions(id)`,
      );
      log.push(`OK: ${t}.mission_id added`);
    }

    // 4) Backfill (uniquement les lignes où mission_id IS NULL)
    for (const t of TABLES_TO_SCOPE) {
      const res = await execute(
        `UPDATE ${t} SET mission_id = ? WHERE mission_id IS NULL`,
        [MISSION_ID],
      );
      log.push(`OK: ${t} backfill (${res.rowsAffected} rows)`);
    }

    // 5) Index composites mission-first
    for (const [name, target] of COMPOSITE_INDEXES) {
      await execute(`CREATE INDEX IF NOT EXISTS ${name} ON ${target}`);
      log.push(`OK: ${name}`);
    }

    // 6) Vérification : plus aucune ligne orpheline
    const orphanChecks = await Promise.all(
      TABLES_TO_SCOPE.map(async (t) => {
        const rows = await query(
          `SELECT COUNT(*) AS c FROM ${t} WHERE mission_id IS NULL`,
        );
        return { table: t, orphans: Number(rows[0]?.c ?? 0) };
      }),
    );
    const orphanTotal = orphanChecks.reduce((sum, x) => sum + x.orphans, 0);

    return NextResponse.json({
      ok: true,
      missionId: MISSION_ID,
      missionSlug: MISSION_SLUG,
      orphanChecks,
      orphanTotal,
      log,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { ok: false, error: message, log },
      { status: 500 },
    );
  }
}
