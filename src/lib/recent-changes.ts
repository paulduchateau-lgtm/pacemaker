import { query } from "./db";
import { listRecentSignals } from "./plaud";

/**
 * Construit un bloc "CHANGEMENTS RÉCENTS" à injecter en fin de prompt de
 * recalibration. Signale explicitement au LLM ce qui a bougé depuis la
 * dernière recalibration, pour qu'il traite ces éléments comme prioritaires
 * sur le contexte mission statique et les chunks RAG figés.
 *
 * Fenêtre : depuis la dernière recalibration réussie pour la mission, sinon
 * 7 jours glissants. Sources :
 *   - decisions (actées depuis la fenêtre)
 *   - events hors recalib
 *   - schedule_changes
 *   - plaud_signals (chantier 5) — signaux émotionnels/relationnels captés
 *     par les transcripts Plaud ingérés
 * Les livrables/rapports n'ont pas de timestamp de modification — leurs
 * changements arrivent via decisions/events et via la recalibration elle-même.
 */

export interface RecentChangesOptions {
  missionId: string;
  /** Override explicite du point de coupure (ISO). */
  since?: string;
  /** Nb max d'items par catégorie. */
  limit?: number;
}

async function resolveSince(missionId: string): Promise<string> {
  const rows = await query(
    `SELECT MAX(created_at) AS last FROM recalibrations
     WHERE mission_id = ? AND reverted_at IS NULL`,
    [missionId],
  );
  const last = rows[0]?.last as string | null | undefined;
  if (last) return last;
  return new Date(Date.now() - 7 * 24 * 3600 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
}

export async function buildRecentChangesBlock(opts: RecentChangesOptions): Promise<{
  block: string;
  sinceIso: string;
  itemCount: number;
}> {
  const limit = opts.limit ?? 20;
  const sinceIso = opts.since ?? (await resolveSince(opts.missionId));

  const [decisionRows, eventRows, scheduleRows, plaudSignals] = await Promise.all([
    query(
      `SELECT id, statement, rationale, week_id, acted_at, status
       FROM decisions
       WHERE mission_id = ? AND acted_at > ?
       ORDER BY acted_at DESC LIMIT ?`,
      [opts.missionId, sinceIso, limit],
    ),
    query(
      `SELECT id, type, label, week_id, date, content
       FROM events
       WHERE mission_id = ? AND date > ? AND type != 'recalib'
       ORDER BY date DESC LIMIT ?`,
      [opts.missionId, sinceIso, limit],
    ),
    query(
      `SELECT id, week_id, field, old_value, new_value, change_type, reason, created_at
       FROM schedule_changes
       WHERE mission_id = ? AND created_at > ?
       ORDER BY created_at DESC LIMIT ?`,
      [opts.missionId, sinceIso, limit],
    ),
    listRecentSignals(opts.missionId, sinceIso, limit).catch(() => []),
  ]);

  const decisions = decisionRows.map(
    (d) =>
      `- Décision [${String(d.id)}] S${d.week_id ?? "?"} (${String(d.status)}) : ${String(d.statement)}${d.rationale ? ` — motifs : ${String(d.rationale)}` : ""}`,
  );
  const events = eventRows.map(
    (e) =>
      `- Événement [${String(e.id)}] ${String(e.type)} S${e.week_id ?? "?"} : ${String(e.label)}${e.content ? ` — ${String(e.content).slice(0, 140)}` : ""}`,
  );
  const schedule = scheduleRows.map(
    (s) =>
      `- Planning [${String(s.id)}] S${s.week_id} ${String(s.field)} ${String(s.old_value ?? "∅")} → ${String(s.new_value)} (${String(s.change_type)})${s.reason ? ` — ${String(s.reason)}` : ""}`,
  );

  // Signaux Plaud : on privilégie les signaux émotionnels/relationnels car
  // les structurels (decision/action/risk) sont déjà capturés par les tables
  // decisions/tasks/risks via des flux séparés.
  const EMOTIONAL_KINDS = new Set([
    "satisfaction",
    "frustration",
    "uncertainty",
    "tension",
    "posture_shift",
  ]);
  const emotionalSignals = plaudSignals.filter((s) => EMOTIONAL_KINDS.has(s.kind));
  const plaud = emotionalSignals.map(
    (s) =>
      `- [${s.intensity}/${s.kind}]${s.subject ? ` ${s.subject} —` : ""} ${s.content}${s.rawExcerpt ? ` « ${s.rawExcerpt.slice(0, 140)} »` : ""} (transcript ${s.transcriptId})`,
  );

  const sections: string[] = [];
  if (decisions.length) sections.push("Décisions actées :\n" + decisions.join("\n"));
  if (events.length) sections.push("Événements :\n" + events.join("\n"));
  if (schedule.length) sections.push("Changements de planning :\n" + schedule.join("\n"));
  if (plaud.length) sections.push("Signaux Plaud (ton, tensions, satisfaction client) :\n" + plaud.join("\n"));

  const itemCount = decisions.length + events.length + schedule.length + plaud.length;

  if (itemCount === 0) {
    return {
      block: `\n=== DONNÉES MODIFIÉES RÉCEMMENT (depuis ${sinceIso}) ===\n(aucun changement enregistré depuis la dernière recalibration)\n=== FIN CHANGEMENTS RÉCENTS ===\n`,
      sinceIso,
      itemCount,
    };
  }

  const body = sections.join("\n\n");
  return {
    block: `\n=== DONNÉES MODIFIÉES RÉCEMMENT — prioritaires sur le contexte mission et les documents RAG ===\n(Depuis ${sinceIso}. Si un élément ci-dessous contredit le contexte mission ou un chunk RAG, c'est CE bloc qui fait foi.)\n\n${body}\n=== FIN CHANGEMENTS RÉCENTS ===\n`,
    sinceIso,
    itemCount,
  };
}
