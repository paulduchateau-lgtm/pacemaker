import { execute, query } from "./db";
import {
  ACTIVITY_LABELS,
  TIME_SAVED_MINUTES,
  type TimeActivity,
} from "@/config/time-conversion";

export interface LogTimeSavingInput {
  missionId: string;
  userId?: string;
  activity: TimeActivity;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

/**
 * Log un événement d'économie de temps. Best-effort — ne throw jamais.
 * Applique TIME_SAVED_MINUTES[activity] comme conversion médiane validée.
 */
export async function logTimeSaving(input: LogTimeSavingInput): Promise<void> {
  const minutes = TIME_SAVED_MINUTES[input.activity];
  if (!minutes || minutes <= 0) return;
  const id = `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await execute(
      `INSERT INTO time_savings
         (id, mission_id, user_id, activity_type, estimated_minutes_saved,
          source_entity_type, source_entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.missionId,
        input.userId ?? "paul",
        input.activity,
        minutes,
        input.sourceEntityType ?? null,
        input.sourceEntityId ?? null,
      ],
    );
  } catch {
    // journal est best-effort
  }
}

export interface TimeSavingsAggregate {
  totalMinutes: number;
  byActivity: Array<{
    activity: TimeActivity;
    label: string;
    count: number;
    minutes: number;
  }>;
  since: string;
  until: string;
}

export async function aggregateTimeSavings(params: {
  missionId: string;
  sinceDays?: number;
}): Promise<TimeSavingsAggregate> {
  const sinceDays = params.sinceDays ?? 0;
  const since =
    sinceDays > 0
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
      : "1970-01-01T00:00:00Z";
  const until = new Date().toISOString();

  const rows = await query(
    `SELECT activity_type, COUNT(*) AS n, SUM(estimated_minutes_saved) AS m
     FROM time_savings
     WHERE mission_id = ? AND created_at >= ?
     GROUP BY activity_type
     ORDER BY m DESC`,
    [params.missionId, since],
  );

  let totalMinutes = 0;
  const byActivity: TimeSavingsAggregate["byActivity"] = [];
  for (const r of rows) {
    const activity = String(r.activity_type) as TimeActivity;
    const minutes = Number(r.m ?? 0);
    totalMinutes += minutes;
    byActivity.push({
      activity,
      label: ACTIVITY_LABELS[activity] ?? activity,
      count: Number(r.n ?? 0),
      minutes,
    });
  }

  return { totalMinutes, byActivity, since, until };
}
