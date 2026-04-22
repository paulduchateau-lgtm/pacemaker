/**
 * Migration — ajout de la colonne documents.status ('active' | 'obsolete').
 * Idempotent.
 *
 * Usage : set -a && source .env.local && set +a && npx tsx scripts/migrate-sources-status.ts
 */
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");
  const db = createClient({ url, authToken: authToken ?? "" });

  try {
    await db.execute({ sql: "ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", args: [] });
    console.log("OK documents.status ajoutée");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
      console.log("SKIP documents.status déjà présente");
    } else {
      throw e;
    }
  }

  console.log("Migration sources-status terminée.");
}
main().catch(e => { console.error(e); process.exit(1); });
