import { NextResponse } from "next/server";
import { execute } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Migration sources-status — ajoute documents.status ('active' | 'obsolete').
 * Idempotente (try/catch sur duplicate column).
 * Appel : POST /api/migrate/sources-status
 */
export async function POST() {
  const log: string[] = [];
  try {
    try {
      await execute(`ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
      log.push("OK documents.status ajoutée");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already")) {
        log.push("SKIP documents.status (déjà présente)");
      } else throw e;
    }
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
