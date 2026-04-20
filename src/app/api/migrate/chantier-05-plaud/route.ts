import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration chantier 05 — ingestion Plaud (transcripts + signaux extraits).
 * Idempotente, additive. À exécuter une fois en POST après déploiement.
 */

export async function POST() {
  const log: string[] = [];
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS plaud_transcripts (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        document_id TEXT REFERENCES documents(id),
        author TEXT NOT NULL DEFAULT 'paul',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
        context_label TEXT,
        duration_seconds INTEGER,
        raw_content TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: plaud_transcripts");

    await execute(`
      CREATE TABLE IF NOT EXISTS plaud_signals (
        id TEXT PRIMARY KEY,
        transcript_id TEXT NOT NULL REFERENCES plaud_transcripts(id) ON DELETE CASCADE,
        mission_id TEXT NOT NULL REFERENCES missions(id),
        kind TEXT NOT NULL CHECK(kind IN
          ('decision','action','risk','opportunity',
           'satisfaction','frustration','uncertainty','tension','posture_shift')),
        content TEXT NOT NULL,
        intensity TEXT NOT NULL DEFAULT 'moderate'
          CHECK(intensity IN ('weak','moderate','strong')),
        subject TEXT,
        raw_excerpt TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    log.push("OK: plaud_signals");

    await execute(
      `CREATE INDEX IF NOT EXISTS idx_plaud_transcripts_mission ON plaud_transcripts(mission_id, recorded_at DESC)`,
    );
    await execute(
      `CREATE INDEX IF NOT EXISTS idx_plaud_signals_mission_kind ON plaud_signals(mission_id, kind, created_at DESC)`,
    );
    await execute(
      `CREATE INDEX IF NOT EXISTS idx_plaud_signals_transcript ON plaud_signals(transcript_id)`,
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
