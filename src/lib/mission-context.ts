import { execute, query } from "./db";
import { DEFAULT_MISSION_SLUG } from "./mission";

/**
 * Contexte mission injecté en tête de tous les prompts LLM (remplace les infos
 * hardcodées). Chantier 1 : source de vérité = `missions.context` (scopé par
 * mission_id). Fallback DEFAULT_MISSION_CONTEXT si la mission n'a pas encore
 * de contexte personnalisé.
 */
export const DEFAULT_MISSION_CONTEXT = `Mission de transformation BI Power BI pour la Direction de l'Action Sociale de l'Agirc-Arrco.
Durée : 7 semaines effectives.
Client : Agirc-Arrco, Direction de l'Action Sociale (DAS).
Contacts : Benoît Baret, Nathalie Lazardeux.`;

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
