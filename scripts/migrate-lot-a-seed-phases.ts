/**
 * Migration lot A — Seed phases pour la mission Agirc-Arrco.
 * Idempotent : verifie l'existence avant insertion.
 *
 * Usage : npx tsx scripts/migrate-lot-a-seed-phases.ts
 */
import { createClient } from "@libsql/client";

const PHASE_DEFS = [
  { order: 1, label: "Cadrage", color: "#A5D900", weekNums: [1] },
  { order: 2, label: "Construction socle", color: "#7AB800", weekNums: [2] },
  { order: 3, label: "Developpement", color: "#2D7D9A", weekNums: [3, 4, 5] },
  { order: 4, label: "Stabilisation", color: "#E8A317", weekNums: [6] },
  { order: 5, label: "Transfert", color: "#D95B2F", weekNums: [7] },
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) throw new Error("TURSO_DATABASE_URL manquant");

  const db = createClient({ url, authToken: authToken ?? "" });

  const missionRows = await db.execute({
    sql: "SELECT id FROM missions WHERE slug = ? LIMIT 1",
    args: ["agirc-arrco-2026"],
  });
  if (!missionRows.rows.length) {
    console.error("Mission agirc-arrco-2026 introuvable");
    process.exit(1);
  }
  const missionId = String(missionRows.rows[0].id);
  console.log("Mission :", missionId);

  for (const def of PHASE_DEFS) {
    const existing = await db.execute({
      sql: "SELECT id FROM phases WHERE mission_id = ? AND order_index = ? LIMIT 1",
      args: [missionId, def.order],
    });

    let phaseId: string;
    if (existing.rows.length) {
      phaseId = String(existing.rows[0].id);
      console.log(`Phase ${def.label} deja existante (${phaseId}), skip creation`);
    } else {
      const weekPlaceholders = def.weekNums.map(() => "?").join(",");
      const dateRows = await db.execute({
        sql: `SELECT MIN(start_date) as sd, MAX(end_date) as ed FROM weeks
              WHERE mission_id = ? AND id IN (${weekPlaceholders})`,
        args: [missionId, ...def.weekNums],
      });
      const startDate = (dateRows.rows[0]?.sd as string | null) ?? null;
      const endDate = (dateRows.rows[0]?.ed as string | null) ?? null;

      phaseId = newId("phase");
      await db.execute({
        sql: `INSERT INTO phases (id, mission_id, order_index, label, color, start_date, end_date)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [phaseId, missionId, def.order, def.label, def.color, startDate, endDate],
      });
      console.log(`Phase ${def.label} creee (${phaseId}), dates ${startDate} => ${endDate}`);

      const msId = newId("ms");
      await db.execute({
        sql: `INSERT INTO milestones (id, mission_id, phase_id, label, target_date)
              VALUES (?, ?, ?, ?, ?)`,
        args: [msId, missionId, phaseId, `Livrables ${def.label} valides`, endDate],
      });
      console.log(`  Milestone cree (${msId})`);

      const scId = newId("sc");
      await db.execute({
        sql: `INSERT INTO success_criteria (id, milestone_id, label, order_index)
              VALUES (?, ?, ?, ?)`,
        args: [scId, msId, "Tous les livrables de phase sont valides par le client", 0],
      });
      console.log(`  Critere de succes cree (${scId})`);
    }

    for (const weekNum of def.weekNums) {
      const weekRow = await db.execute({
        sql: "SELECT id FROM weeks WHERE mission_id = ? AND id = ? LIMIT 1",
        args: [missionId, weekNum],
      });
      if (weekRow.rows.length) {
        await db.execute({
          sql: "UPDATE weeks SET phase_id = ? WHERE id = ? AND mission_id = ?",
          args: [phaseId, weekNum, missionId],
        });
        console.log(`  Semaine ${weekNum} => phase_id ${phaseId}`);
      } else {
        console.warn(`  Semaine ${weekNum} introuvable pour mission ${missionId}`);
      }
    }
  }

  console.log("Seed phases termine.");
}

main().catch((e) => { console.error(e); process.exit(1); });
