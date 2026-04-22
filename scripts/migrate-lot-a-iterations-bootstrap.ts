/**
 * Migration lot A — Bootstrap des iterations pour les livrables existants.
 * Pour chaque livrable sans iteration, cree une iteration unique (order=1)
 * rattachee a la phase deduite du week_id => weeks.phase_id.
 * Idempotent.
 *
 * Usage : npx tsx scripts/migrate-lot-a-iterations-bootstrap.ts
 */
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");

  const db = createClient({ url, authToken: authToken ?? "" });

  const livRows = await db.execute({
    sql: `SELECT l.id as liv_id, l.mission_id, l.week_id, w.phase_id
          FROM livrables l
          LEFT JOIN weeks w ON w.id = l.week_id AND w.mission_id = l.mission_id
          WHERE l.mission_id IS NOT NULL`,
    args: [],
  });

  let created = 0;
  let skipped = 0;
  const questions: string[] = [];

  for (const row of livRows.rows) {
    const livId = String(row.liv_id);
    const missionId = String(row.mission_id);
    const phaseId = row.phase_id ? String(row.phase_id) : null;

    const existing = await db.execute({
      sql: "SELECT id FROM deliverable_iterations WHERE deliverable_id = ? LIMIT 1",
      args: [livId],
    });
    if (existing.rows.length) { skipped++; continue; }

    if (!phaseId) {
      questions.push(`Livrable ${livId} (semaine ${row.week_id}) : semaine sans phase_id`);
      continue;
    }

    const iterId = newId("iter");
    await db.execute({
      sql: `INSERT INTO deliverable_iterations
            (id, deliverable_id, mission_id, phase_id, order_index)
            VALUES (?, ?, ?, ?, ?)`,
      args: [iterId, livId, missionId, phaseId, 1],
    });

    await db.execute({
      sql: "UPDATE livrables SET primary_phase_id = ? WHERE id = ?",
      args: [phaseId, livId],
    });

    created++;
  }

  console.log(`Iterations creees : ${created}, deja existantes : ${skipped}`);
  if (questions.length) {
    console.warn("Questions a remonter :");
    questions.forEach((q) => console.warn(" -", q));
  }
  console.log("Bootstrap iterations termine.");
}

main().catch((e) => { console.error(e); process.exit(1); });
