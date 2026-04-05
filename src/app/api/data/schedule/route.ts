import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { computeAllWeekDates, daysBetween } from "@/lib/dates";

export const dynamic = "force-dynamic";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Initialize all dates from mission start
    if (action === "initialize") {
      const { missionStartDate } = body;
      const dates = computeAllWeekDates(missionStartDate, 7);

      for (let i = 0; i < dates.length; i++) {
        await execute(
          `UPDATE weeks SET start_date = ?, end_date = ?,
           baseline_start_date = ?, baseline_end_date = ?
           WHERE id = ?`,
          [dates[i].startDate, dates[i].endDate, dates[i].startDate, dates[i].endDate, i + 1]
        );
      }

      // Update livrables delivery dates
      for (let i = 0; i < dates.length; i++) {
        await execute(
          "UPDATE livrables SET delivery_date = ? WHERE week_id = ?",
          [dates[i].endDate, i + 1]
        );
      }

      await execute(
        "INSERT OR REPLACE INTO project (key, value) VALUES ('mission_start_date', ?)",
        [missionStartDate]
      );

      return NextResponse.json({ ok: true });
    }

    // Change a specific week's date
    if (action === "change_date") {
      const { weekId, newStartDate, cascade, changeType, reason } = body;

      const weekRows = await query("SELECT * FROM weeks WHERE id = ?", [weekId]);
      if (weekRows.length === 0) {
        return NextResponse.json({ error: "Semaine non trouvée" }, { status: 404 });
      }

      const oldStart = weekRows[0].start_date as string | null;
      const newEnd = addDays(newStartDate, 4);
      const shiftDays = oldStart ? daysBetween(oldStart, newStartDate) : 0;

      // Update target week
      await execute(
        "UPDATE weeks SET start_date = ?, end_date = ? WHERE id = ?",
        [newStartDate, newEnd, weekId]
      );
      await execute(
        "UPDATE livrables SET delivery_date = ? WHERE week_id = ?",
        [newEnd, weekId]
      );

      // Cascade if requested
      if (cascade && shiftDays !== 0) {
        const laterWeeks = await query(
          "SELECT id, start_date, end_date FROM weeks WHERE id > ? ORDER BY id",
          [weekId]
        );
        for (const w of laterWeeks) {
          if (w.start_date && w.end_date) {
            const newS = addDays(w.start_date as string, shiftDays);
            const newE = addDays(w.end_date as string, shiftDays);
            await execute(
              "UPDATE weeks SET start_date = ?, end_date = ? WHERE id = ?",
              [newS, newE, w.id]
            );
            await execute(
              "UPDATE livrables SET delivery_date = ? WHERE week_id = ?",
              [newE, w.id]
            );
          }
        }
      }

      // Log schedule change
      const changeId = `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        `INSERT INTO schedule_changes (id, week_id, field, old_value, new_value, change_type, cascaded, reason)
         VALUES (?, ?, 'start_date', ?, ?, ?, ?, ?)`,
        [changeId, weekId, oldStart || "", newStartDate, changeType, cascade ? 1 : 0, reason || ""]
      );

      // Log event
      const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const label = changeType === "recalage_planifie"
        ? `Recalage planifié S${weekId}${cascade ? ` (+S${weekId + 1} à S7)` : ""}`
        : `Déviation planning S${weekId}${cascade ? ` (+S${weekId + 1} à S7)` : ""} — ${shiftDays > 0 ? "+" : ""}${shiftDays}j`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content) VALUES (?, 'schedule', ?, ?, ?)",
        [evtId, label, weekId, reason || `Décalage de ${shiftDays} jours`]
      );

      return NextResponse.json({ ok: true, shiftDays });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
