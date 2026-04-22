import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration lot B — DDL intake_items + plan_impacts. Idempotente.
 * Appel : POST /api/migrate/lot-b
 */
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS intake_items (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions(id),
    source_type TEXT NOT NULL
      CHECK(source_type IN ('cr_text','upload','capture','vocal','pdf','json','note','wa_message')),
    source_ref TEXT,
    raw_content_ref TEXT,
    raw_content_excerpt TEXT,
    parsed_content TEXT,
    parse_generation_id TEXT REFERENCES generations(id),
    status TEXT NOT NULL DEFAULT 'pending_parse'
      CHECK(status IN ('pending_parse','parsed','reviewed','archived')),
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    parsed_at TEXT,
    reviewed_at TEXT,
    document_id TEXT REFERENCES documents(id),
    created_by TEXT NOT NULL DEFAULT 'paul'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_intake_items_mission ON intake_items(mission_id, ingested_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_intake_items_status ON intake_items(mission_id, status)`,
  `CREATE TABLE IF NOT EXISTS plan_impacts (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL REFERENCES missions(id),
    intake_id TEXT REFERENCES intake_items(id),
    generation_id TEXT REFERENCES generations(id),
    target_type TEXT NOT NULL
      CHECK(target_type IN ('task','risk','livrable','iteration','phase','milestone','success_criterion','decision','week','context_item')),
    target_id TEXT,
    change_type TEXT NOT NULL
      CHECK(change_type IN ('add','modify','remove','reorder','reclassify','link','unlink')),
    diff_before TEXT,
    diff_after TEXT,
    rationale TEXT,
    confidence REAL,
    severity TEXT NOT NULL DEFAULT 'moderate'
      CHECK(severity IN ('minor','moderate','major')),
    status TEXT NOT NULL DEFAULT 'proposed'
      CHECK(status IN ('proposed','modified','accepted','rejected','superseded','auto_applied')),
    order_index INTEGER NOT NULL DEFAULT 0,
    decided_at TEXT,
    decided_by TEXT,
    agent_action_id TEXT REFERENCES agent_actions(id),
    superseded_by TEXT REFERENCES plan_impacts(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_plan_impacts_mission ON plan_impacts(mission_id, status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_plan_impacts_intake ON plan_impacts(intake_id, order_index)`,
  `CREATE INDEX IF NOT EXISTS idx_plan_impacts_target ON plan_impacts(target_type, target_id)`,
];

export async function POST() {
  const log: string[] = [];
  try {
    for (const sql of MIGRATIONS) {
      await execute(sql);
      log.push("OK " + sql.slice(0, 55).replace(/\s+/g, " ").trim() + "...");
    }
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
