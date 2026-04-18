import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 07a (préparation WhatsApp) — agent_actions hybride.
 * Option C validée par Paul (cf. docs/design/agent-actions-unification.md).
 *
 * Tables créées :
 *   - wa_conversations  : fil de discussion par mission
 *   - wa_messages       : messages bruts entrants/sortants
 *   - agent_actions     : journal narratif léger qui pointe vers les tables
 *                         spécialisées (decisions, incoherences, recalibrations,
 *                         tasks). UNIQUE table consultée pour le "Journal agent".
 *
 * La migration est idempotente et additive. Le webhook Meta (itération 1b)
 * n'est PAS câblé ici.
 */

const INDEXES: Array<[string, string]> = [
  ["idx_wa_messages_conv", "wa_messages(conversation_id, created_at)"],
  ["idx_wa_messages_dedup", "wa_messages(wa_message_id)"],
  ["idx_agent_actions_mission", "agent_actions(mission_id, created_at)"],
  ["idx_agent_actions_target", "agent_actions(target_entity_type, target_entity_id)"],
  ["idx_agent_actions_source_msg", "agent_actions(source_message_id)"],
];

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS wa_conversations (
        id TEXT PRIMARY KEY,
        mission_id TEXT REFERENCES missions(id),
        phone_number TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: wa_conversations");

    await execute(`
      CREATE TABLE IF NOT EXISTS wa_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES wa_conversations(id),
        direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
        type TEXT NOT NULL CHECK(type IN ('text','audio','image','document')),
        raw_content TEXT,
        blob_url TEXT,
        wa_message_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: wa_messages");

    await execute(`
      CREATE TABLE IF NOT EXISTS agent_actions (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        source_message_id TEXT REFERENCES wa_messages(id),
        action_type TEXT NOT NULL CHECK(action_type IN (
          'create_task','update_task','update_deliverable',
          'add_context','create_decision','flag_incoherence',
          'recalibrate_plan','ask_user','noop'
        )),
        target_entity_type TEXT,
        target_entity_id TEXT,
        narrative TEXT NOT NULL,
        reasoning TEXT,
        before_state TEXT,
        after_state TEXT,
        confidence REAL,
        reverted_at TEXT,
        reverted_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: agent_actions");

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
