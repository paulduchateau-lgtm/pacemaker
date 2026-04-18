import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { computeAllWeekDates, daysBetween } from "@/lib/dates";
import { resolveActiveMission, updateMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = await req.json();
    const { action } = body;

    if (action === "initialize") {
      const { missionStartDate } = body;
      const dates = computeAllWeekDates(missionStartDate, 7);
      for (let i = 0; i < dates.length; i++) {
        await execute(
          `UPDATE weeks SET start_date = ?, end_date = ?,
             baseline_start_date = ?, baseline_end_date = ?
             WHERE id = ? AND mission_id = ?`,
          [
            dates[i].startDate,
            dates[i].endDate,
            dates[i].startDate,
            dates[i].endDate,
            i + 1,
            mission.id,
          ],
        );
        await execute(
          "UPDATE livrables SET delivery_date = ? WHERE week_id = ? AND mission_id = ?",
          [dates[i].endDate, i + 1, mission.id],
        );
      }
      // Sync missions.start_date / end_date aussi
      await updateMission(mission.id, {
        startDate: dates[0].startDate,
        endDate: dates[dates.length - 1].endDate,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "change_date") {
      const { weekId, newStartDate, cascade, changeType, reason } = body;

      const weekRows = await query(
        "SELECT * FROM weeks WHERE id = ? AND mission_id = ?",
        [weekId, mission.id],
      );
      if (weekRows.length === 0) {
        return NextResponse.json(
          { error: "Semaine non trouvée" },
          { status: 404 },
        );
      }

      const oldStart = weekRows[0].start_date as string | null;
      const newEnd = addDays(newStartDate, 4);
      const shiftDays = oldStart ? daysBetween(oldStart, newStartDate) : 0;

      await execute(
        "UPDATE weeks SET start_date = ?, end_date = ? WHERE id = ? AND mission_id = ?",
        [newStartDate, newEnd, weekId, mission.id],
      );
      await execute(
        "UPDATE livrables SET delivery_date = ? WHERE week_id = ? AND mission_id = ?",
        [newEnd, weekId, mission.id],
      );

      if (cascade && shiftDays !== 0) {
        const laterWeeks = await query(
          "SELECT id, start_date, end_date FROM weeks WHERE id > ? AND mission_id = ? ORDER BY id",
          [weekId, mission.id],
        );
        for (const w of laterWeeks) {
          if (w.start_date && w.end_date) {
            const newS = addDays(w.start_date as string, shiftDays);
            const newE = addDays(w.end_date as string, shiftDays);
            await execute(
              "UPDATE weeks SET start_date = ?, end_date = ? WHERE id = ? AND mission_id = ?",
              [newS, newE, w.id, mission.id],
            );
            await execute(
              "UPDATE livrables SET delivery_date = ? WHERE week_id = ? AND mission_id = ?",
              [newE, w.id, mission.id],
            );
          }
        }
      }

      const changeId = `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        `INSERT INTO schedule_changes (id, week_id, field, old_value, new_value, change_type, cascaded, reason, mission_id)
         VALUES (?, ?, 'start_date', ?, ?, ?, ?, ?, ?)`,
        [
          changeId,
          weekId,
          oldStart || "",
          newStartDate,
          changeType,
          cascade ? 1 : 0,
          reason || "",
          mission.id,
        ],
      );

      const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const label =
        changeType === "recalage_planifie"
          ? `Recalage planifié S${weekId}${cascade ? ` (+S${weekId + 1} à S7)` : ""}`
          : `Déviation planning S${weekId}${cascade ? ` (+S${weekId + 1} à S7)` : ""} — ${shiftDays > 0 ? "+" : ""}${shiftDays}j`;
      await execute(
        `INSERT INTO events (id, type, label, week_id, content, mission_id)
         VALUES (?, 'schedule', ?, ?, ?, ?)`,
        [
          evtId,
          label,
          weekId,
          reason || `Décalage de ${shiftDays} jours`,
          mission.id,
        ],
      );

      return NextResponse.json({ ok: true, shiftDays });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
