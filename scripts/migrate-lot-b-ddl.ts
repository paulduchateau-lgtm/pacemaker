/**
 * Migration lot B — DDL : tables intake_items et plan_impacts.
 * Idempotent (IF NOT EXISTS).
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/migrate-lot-b-ddl.ts
 */
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");

  const db = createClient({ url, authToken: authToken ?? "" });

  const statements = [
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
        CHECK(target_type IN (
          'task','risk','livrable','iteration','phase','milestone',
          'success_criterion','decision','week','context_item'
        )),
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

  for (const sql of statements) {
    await db.execute({ sql, args: [] });
    const name = sql.match(/(?:TABLE|INDEX)\s+(?:IF NOT EXISTS\s+)?(\S+)/i)?.[1] ?? "?";
    console.log("OK", name);
  }

  console.log("\nDDL lot B appliqué avec succès.");
}

main().catch((e) => { console.error(e); process.exit(1); });
