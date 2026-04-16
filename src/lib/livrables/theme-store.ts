import { query, execute } from "../db";
import { DEFAULT_THEME_ID } from "./themes";

const KEY = "livrable_theme";

/**
 * Lit le thème courant du projet. Défaut : liteops.
 */
export async function getLivrableTheme(): Promise<string> {
  try {
    const rows = await query("SELECT value FROM project WHERE key = ?", [KEY]);
    if (rows.length > 0 && rows[0].value) {
      const v = (rows[0].value as string).trim();
      if (v.length > 0) return v;
    }
  } catch {
    // table absente au premier boot
  }
  return DEFAULT_THEME_ID;
}

export async function setLivrableTheme(value: string): Promise<void> {
  await execute(
    "INSERT OR REPLACE INTO project (key, value) VALUES (?, ?)",
    [KEY, value]
  );
}
