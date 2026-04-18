import { query, execute } from "../db";
import { DEFAULT_THEME_ID } from "./themes";
import { DEFAULT_MISSION_SLUG } from "../mission-constants";

/**
 * Chantier 1 : source de vérité = missions.theme.
 * Fallback DEFAULT_THEME_ID si la mission n'a pas de thème ou n'est pas encore
 * connue (premier boot, avant migration).
 */

export async function getLivrableTheme(
  ref?: { missionId?: string; slug?: string },
): Promise<string> {
  try {
    if (ref?.missionId) {
      const rows = await query(
        "SELECT theme FROM missions WHERE id = ? LIMIT 1",
        [ref.missionId],
      );
      const v = (rows[0]?.theme as string | undefined)?.trim();
      if (v) return v;
    } else {
      const slug = ref?.slug ?? DEFAULT_MISSION_SLUG;
      const rows = await query(
        "SELECT theme FROM missions WHERE slug = ? LIMIT 1",
        [slug],
      );
      const v = (rows[0]?.theme as string | undefined)?.trim();
      if (v) return v;
    }
  } catch {
    // table missions absente (premier boot avant migration chantier 1)
  }
  return DEFAULT_THEME_ID;
}

export async function setLivrableTheme(
  missionId: string,
  value: string,
): Promise<void> {
  await execute(
    "UPDATE missions SET theme = ?, updated_at = datetime('now') WHERE id = ?",
    [value, missionId],
  );
}
