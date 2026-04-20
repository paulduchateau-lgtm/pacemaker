import { execute, query } from "./db";

/**
 * Semaine courante d'une mission. Stockée dans la table `project` (k/v global)
 * sous forme `current_week:<missionId>` pour scoping multi-mission. Fallback
 * sur la key `current_week` (legacy mono-mission) pendant la transition.
 *
 * Bug connu avant ce helper : les auto-recalibrations lisaient `current_week`
 * global, donc en contexte multi-mission la dernière mission consultée
 * écrasait silencieusement la semaine courante des autres missions.
 */

function scopedKey(missionId: string): string {
  return `current_week:${missionId}`;
}

export async function getCurrentWeek(missionId: string): Promise<number> {
  const scoped = await query(
    "SELECT value FROM project WHERE key = ? LIMIT 1",
    [scopedKey(missionId)],
  );
  const parse = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const scopedVal = parse(scoped[0]?.value);
  if (scopedVal !== null) return scopedVal;

  // Fallback legacy : key non-scopée (valeur partagée entre missions).
  const global = await query(
    "SELECT value FROM project WHERE key = 'current_week' LIMIT 1",
  );
  const globalVal = parse(global[0]?.value);
  return globalVal ?? 1;
}

export async function setCurrentWeek(
  missionId: string,
  week: number,
): Promise<void> {
  const normalized = Math.max(1, Math.floor(week));
  await execute(
    "INSERT OR REPLACE INTO project (key, value) VALUES (?, ?)",
    [scopedKey(missionId), String(normalized)],
  );
}
