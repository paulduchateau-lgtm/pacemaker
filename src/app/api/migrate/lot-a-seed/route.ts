import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

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

/**
 * Seed les 5 phases pour la mission active (Agirc-Arrco par défaut).
 * + milestones + success_criteria de base, + rattachement weeks.phase_id.
 * Idempotent (vérifie l'existence avant insertion).
 */
export async function POST(req: NextRequest) {
  const mission = await resolveActiveMission(req);
  const missionId = mission.id;
  const log: string[] = [];

  for (const def of PHASE_DEFS) {
    const existing = await query(
      "SELECT id FROM phases WHERE mission_id = ? AND order_index = ? LIMIT 1",
      [missionId, def.order],
    ) as Row[];

    let phaseId: string;
    if (existing.length) {
      phaseId = String(existing[0].id);
      log.push(`SKIP phase ${def.label}`);
    } else {
      const placeholders = def.weekNums.map(() => "?").join(",");
      const dateRows = await query(
        `SELECT MIN(start_date) as sd, MAX(end_date) as ed FROM weeks
         WHERE mission_id = ? AND id IN (${placeholders})`,
        [missionId, ...def.weekNums],
      ) as Row[];
      const startDate = (dateRows[0]?.sd as string | null) ?? null;
      const endDate = (dateRows[0]?.ed as string | null) ?? null;

      phaseId = newId("phase");
      await execute(
        `INSERT INTO phases (id, mission_id, order_index, label, color, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [phaseId, missionId, def.order, def.label, def.color, startDate, endDate],
      );
      log.push(`OK phase ${def.label}`);

      const msId = newId("ms");
      await execute(
        `INSERT INTO milestones (id, mission_id, phase_id, label, target_date)
         VALUES (?, ?, ?, ?, ?)`,
        [msId, missionId, phaseId, `Livrables ${def.label} valides`, endDate],
      );
      await execute(
        `INSERT INTO success_criteria (id, milestone_id, label, order_index)
         VALUES (?, ?, ?, ?)`,
        [newId("sc"), msId, "Tous les livrables de phase sont valides par le client", 0],
      );
    }

    for (const weekNum of def.weekNums) {
      const weekRow = await query(
        "SELECT id FROM weeks WHERE mission_id = ? AND id = ? LIMIT 1",
        [missionId, weekNum],
      ) as Row[];
      if (weekRow.length) {
        await execute(
          "UPDATE weeks SET phase_id = ? WHERE id = ? AND mission_id = ?",
          [phaseId, weekNum, missionId],
        );
      }
    }
  }

  return NextResponse.json({ ok: true, log });
}
