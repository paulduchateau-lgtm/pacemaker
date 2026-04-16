import { query, execute } from "./db";

export const DEFAULT_MISSION_CONTEXT = `Mission de transformation BI Power BI pour la Direction de l'Action Sociale de l'Agirc-Arrco.
Durée : 7 semaines effectives.
Client : Agirc-Arrco, Direction de l'Action Sociale (DAS).
Contacts : Benoît Baret, Nathalie Lazardeux.`;

/**
 * Lit le contexte mission stocké dans project.mission_context.
 * Retourne le DEFAULT_MISSION_CONTEXT si aucune valeur personnalisée n'est enregistrée.
 * Ce contexte est injecté dans tous les prompts LLM pour remplacer les infos hardcodées.
 */
export async function getMissionContext(): Promise<string> {
  try {
    const rows = await query(
      "SELECT value FROM project WHERE key = 'mission_context'"
    );
    if (rows.length > 0 && rows[0].value) {
      const value = (rows[0].value as string).trim();
      if (value.length > 0) return value;
    }
  } catch {
    // table project peut ne pas exister lors du tout premier boot
  }
  return DEFAULT_MISSION_CONTEXT;
}

export async function setMissionContext(value: string): Promise<void> {
  await execute(
    "INSERT OR REPLACE INTO project (key, value) VALUES ('mission_context', ?)",
    [value]
  );
}
