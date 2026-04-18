import { execute, query } from "./db";
import { callLLMWithUsage, parseJSON } from "./llm";
import { logTokenUsage } from "./token-usage";
import { getMissionContext } from "./mission-context";
import { requireMissionBySlug } from "./mission";

export type BriefingLevel = "30s" | "2min" | "10min";

export interface Briefing {
  generatedAt: string;
  missionSlug: string;
  levels: {
    "30s": string;
    "2min": string;
    "10min": string;
  };
  meta: {
    sinceLastVisit: string;
    pendingDecisions: number;
    pendingIncoherences: number;
    blockedTasks: number;
  };
}

const CACHE_TTL_MS = 15 * 60 * 1000;

async function loadChangesSince(
  missionId: string,
  since: string,
): Promise<string> {
  // Compile un résumé JSON des changements depuis `since`
  const [tasksChanged, decisionsNew, incoherencesPending, recalibrations, events] =
    await Promise.all([
      query(
        `SELECT id, label, status, week_id FROM tasks
         WHERE mission_id = ? AND (created_at > ? OR completed_at > ?)
         ORDER BY created_at DESC LIMIT 20`,
        [missionId, since, since],
      ),
      query(
        `SELECT id, statement, author, week_id FROM decisions
         WHERE mission_id = ? AND acted_at > ? ORDER BY acted_at DESC LIMIT 20`,
        [missionId, since],
      ),
      query(
        `SELECT id, kind, severity, description FROM incoherences
         WHERE mission_id = ? AND resolution_status = 'pending'
         ORDER BY created_at DESC LIMIT 20`,
        [missionId],
      ),
      query(
        `SELECT id, trigger, scope, changes_summary, created_at FROM recalibrations
         WHERE mission_id = ? AND created_at > ? AND reverted_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
        [missionId, since],
      ),
      query(
        `SELECT id, type, label, date FROM events
         WHERE mission_id = ? AND date > ? ORDER BY date DESC LIMIT 30`,
        [missionId, since],
      ),
    ]);

  return JSON.stringify(
    {
      tasksChanged: tasksChanged.length,
      tasksChangedSamples: tasksChanged.slice(0, 10),
      decisionsNew: decisionsNew.length,
      decisionsNewSamples: decisionsNew.slice(0, 10),
      incoherencesPending: incoherencesPending.length,
      incoherencesPendingSamples: incoherencesPending.slice(0, 5),
      recalibrations: recalibrations.length,
      recalibrationsSamples: recalibrations.slice(0, 5),
      eventsCount: events.length,
      eventsSamples: events.slice(0, 10),
    },
    null,
    2,
  );
}

async function getCountsForMeta(missionId: string): Promise<{
  pendingDecisions: number;
  pendingIncoherences: number;
  blockedTasks: number;
}> {
  const [d, i, t] = await Promise.all([
    query(
      `SELECT COUNT(*) c FROM decisions WHERE mission_id = ? AND status = 'proposée'`,
      [missionId],
    ),
    query(
      `SELECT COUNT(*) c FROM incoherences WHERE mission_id = ? AND resolution_status = 'pending'`,
      [missionId],
    ),
    query(
      `SELECT COUNT(*) c FROM tasks WHERE mission_id = ? AND status = 'bloqué'`,
      [missionId],
    ),
  ]);
  return {
    pendingDecisions: Number(d[0]?.c ?? 0),
    pendingIncoherences: Number(i[0]?.c ?? 0),
    blockedTasks: Number(t[0]?.c ?? 0),
  };
}

function buildBriefingPrompt(
  missionLabel: string,
  missionContext: string,
  changesJson: string,
  sinceLabel: string,
): string {
  return `Tu es le chef de cabinet de Paul Duchâteau sur une mission de conseil.
Ton job : lui permettre de rouvrir la mission "${missionLabel}" en 30 secondes.

CONTEXTE MISSION :
${missionContext || "(pas de contexte additionnel)"}

ÉVÉNEMENTS DEPUIS LA DERNIÈRE VISITE (${sinceLabel}) :
${changesJson}

Produis 3 briefings de granularités croissantes, tous en français, ton
direct, pas de politesse.

- Le 30s : 3 à 5 puces ultra-courtes. Ce qui a bougé, les 2-3 décisions qui
  attendent Paul, ce qui est urgent.
- Le 2min : 2-3 paragraphes structurés. Ajoute les blocages, les risques
  émergents, les opportunités.
- Le 10min : synthèse complète avec points d'action priorisés (1., 2., 3.),
  impacts transverses, dépendances, questions ouvertes.

Si RIEN n'a bougé depuis la dernière visite, dis-le explicitement sans
meubler.

Format de réponse (strict JSON, sans backticks) :
{
  "30s": "texte markdown court",
  "2min": "texte markdown moyen",
  "10min": "texte markdown long"
}`;
}

async function getOrCreateVisit(
  missionId: string,
  userId: string,
): Promise<{ lastVisit: string; cacheRaw: string | null; cacheGeneratedAt: string | null }> {
  const rows = await query(
    `SELECT last_visit_at, briefing_cache, briefing_cache_generated_at
     FROM mission_visits WHERE mission_id = ? AND user_id = ? LIMIT 1`,
    [missionId, userId],
  );
  if (rows.length > 0) {
    return {
      lastVisit: String(rows[0].last_visit_at),
      cacheRaw: (rows[0].briefing_cache as string | null) ?? null,
      cacheGeneratedAt:
        (rows[0].briefing_cache_generated_at as string | null) ?? null,
    };
  }
  const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const old = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  await execute(
    `INSERT INTO mission_visits (id, mission_id, user_id, last_visit_at)
     VALUES (?, ?, ?, ?)`,
    [id, missionId, userId, old],
  );
  return { lastVisit: old, cacheRaw: null, cacheGeneratedAt: null };
}

export async function generateBriefing(params: {
  missionSlug: string;
  userId?: string;
  forceRefresh?: boolean;
}): Promise<Briefing> {
  const mission = await requireMissionBySlug(params.missionSlug);
  const userId = params.userId ?? "paul";
  const { lastVisit, cacheRaw, cacheGeneratedAt } = await getOrCreateVisit(
    mission.id,
    userId,
  );

  // Cache hit ?
  if (!params.forceRefresh && cacheRaw && cacheGeneratedAt) {
    const age = Date.now() - new Date(cacheGeneratedAt).getTime();
    if (age < CACHE_TTL_MS) {
      try {
        const cached = JSON.parse(cacheRaw) as Briefing;
        return cached;
      } catch {
        /* cache corrompu, on regénère */
      }
    }
  }

  const changes = await loadChangesSince(mission.id, lastVisit);
  const missionContext = await getMissionContext({ missionId: mission.id });
  const prompt = buildBriefingPrompt(
    mission.label,
    missionContext,
    changes,
    lastVisit,
  );

  const { text, usage, model } = await callLLMWithUsage(prompt, 3000);
  await logTokenUsage({
    missionId: mission.id,
    route: "briefing/generate",
    model,
    usage,
    triggeredBy: "user",
  });

  let levels: Briefing["levels"];
  try {
    levels = parseJSON<Briefing["levels"]>(text);
    if (!levels["30s"] || !levels["2min"] || !levels["10min"]) {
      throw new Error("missing levels");
    }
  } catch {
    // Fallback : un seul texte répété partout
    levels = { "30s": text, "2min": text, "10min": text };
  }

  const counts = await getCountsForMeta(mission.id);
  const briefing: Briefing = {
    generatedAt: new Date().toISOString(),
    missionSlug: mission.slug,
    levels,
    meta: {
      sinceLastVisit: lastVisit,
      pendingDecisions: counts.pendingDecisions,
      pendingIncoherences: counts.pendingIncoherences,
      blockedTasks: counts.blockedTasks,
    },
  };

  // Update cache + last_visit_at
  await execute(
    `UPDATE mission_visits
       SET briefing_cache = ?, briefing_cache_generated_at = datetime('now'),
           last_visit_at = datetime('now')
     WHERE mission_id = ? AND user_id = ?`,
    [JSON.stringify(briefing), mission.id, userId],
  );

  // Chantier 8 : trace le temps gagné quand un briefing est consulté.
  try {
    const { logTimeSaving } = await import("./time-savings");
    await logTimeSaving({
      missionId: mission.id,
      activity: "briefing_consulted",
    });
  } catch {
    /* best-effort */
  }

  return briefing;
}

/**
 * Invalide le cache pour forcer un prochain briefing frais. Appelable depuis
 * les routes qui écrivent (création de tâche, parse CR, etc.) si on veut
 * garantir un briefing à jour à chaque retour sur la mission.
 */
export async function invalidateBriefingCache(missionId: string): Promise<void> {
  await execute(
    `UPDATE mission_visits
       SET briefing_cache = NULL, briefing_cache_generated_at = NULL
     WHERE mission_id = ?`,
    [missionId],
  );
}
