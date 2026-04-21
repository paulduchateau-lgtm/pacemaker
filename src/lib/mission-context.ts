import { execute, query } from "./db";
import { DEFAULT_MISSION_SLUG } from "./mission";

/**
 * Contexte mission injecté en tête de tous les prompts LLM. Source de vérité :
 * colonne `missions.context` (scopée par mission_id). Si la mission n'a pas
 * encore de contexte renseigné, le fallback est une chaîne vide — le LLM se
 * débrouille avec les infos dérivées du plan (nom mission, phases, semaines,
 * décisions). Chantier 6 : suppression du fallback Agirc-Arrco hardcodé qui
 * fuitait le contexte d'une mission dans les autres en multi-tenant.
 */
export const DEFAULT_MISSION_CONTEXT = "";

async function getContextForMissionId(missionId: string): Promise<string | null> {
  const rows = await query(
    "SELECT context FROM missions WHERE id = ? LIMIT 1",
    [missionId],
  );
  const raw = rows[0]?.context as string | null | undefined;
  if (raw && raw.trim().length > 0) return raw.trim();
  return null;
}

async function getContextForSlug(slug: string): Promise<string | null> {
  const rows = await query(
    "SELECT context FROM missions WHERE slug = ? LIMIT 1",
    [slug],
  );
  const raw = rows[0]?.context as string | null | undefined;
  if (raw && raw.trim().length > 0) return raw.trim();
  return null;
}

/**
 * Récupère le contexte mission. Signature tolérante pendant la transition :
 * - si missionId fourni : charge ce contexte précis
 * - si slug fourni : résout via slug
 * - sinon : fallback sur DEFAULT_MISSION_SLUG, puis sur DEFAULT_MISSION_CONTEXT
 */
export async function getMissionContext(
  ref?: { missionId?: string; slug?: string } | string,
): Promise<string> {
  try {
    if (typeof ref === "string") ref = { missionId: ref };
    if (ref?.missionId) {
      const v = await getContextForMissionId(ref.missionId);
      if (v) return v;
    } else if (ref?.slug) {
      const v = await getContextForSlug(ref.slug);
      if (v) return v;
    } else {
      const v = await getContextForSlug(DEFAULT_MISSION_SLUG);
      if (v) return v;
    }
  } catch {
    // table missions pas encore créée (tout premier boot / avant migration)
  }
  return DEFAULT_MISSION_CONTEXT;
}

export async function setMissionContext(
  missionId: string,
  value: string,
): Promise<void> {
  await execute(
    "UPDATE missions SET context = ?, updated_at = datetime('now') WHERE id = ?",
    [value, missionId],
  );
}
