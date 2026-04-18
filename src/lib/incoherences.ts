import { execute, query } from "./db";
import { callLLMWithUsage, parseJSON } from "./llm";
import { logTokenUsage } from "./token-usage";

export type IncoherenceKind =
  | "factual"
  | "scope_drift"
  | "constraint_change"
  | "hypothesis_invalidated";

export type IncoherenceSeverity = "minor" | "moderate" | "major";

export type IncoherenceResolutionStatus =
  | "pending"
  | "auto_resolved"
  | "user_acknowledged"
  | "user_rejected"
  | "ignored";

export interface Incoherence {
  id: string;
  missionId: string;
  kind: IncoherenceKind;
  severity: IncoherenceSeverity;
  description: string;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceMessageId: string | null;
  conflictingEntityType: string;
  conflictingEntityId: string;
  autoResolution: string | null;
  resolutionStatus: IncoherenceResolutionStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  briefedToUserAt: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

function rowToIncoherence(r: Row): Incoherence {
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    kind: String(r.kind) as IncoherenceKind,
    severity: String(r.severity) as IncoherenceSeverity,
    description: String(r.description),
    sourceEntityType: String(r.source_entity_type),
    sourceEntityId: String(r.source_entity_id),
    sourceMessageId: (r.source_message_id as string | null) ?? null,
    conflictingEntityType: String(r.conflicting_entity_type),
    conflictingEntityId: String(r.conflicting_entity_id),
    autoResolution: (r.auto_resolution as string | null) ?? null,
    resolutionStatus: String(
      r.resolution_status,
    ) as IncoherenceResolutionStatus,
    resolvedAt: (r.resolved_at as string | null) ?? null,
    resolvedBy: (r.resolved_by as string | null) ?? null,
    briefedToUserAt: (r.briefed_to_user_at as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

const COLS =
  "id, mission_id, kind, severity, description, source_entity_type, source_entity_id, source_message_id, conflicting_entity_type, conflicting_entity_id, auto_resolution, resolution_status, resolved_at, resolved_by, briefed_to_user_at, created_at";

export async function listIncoherences(
  missionId: string,
  opts: { pendingOnly?: boolean; limit?: number } = {},
): Promise<Incoherence[]> {
  let sql = `SELECT ${COLS} FROM incoherences WHERE mission_id = ?`;
  const args: (string | number)[] = [missionId];
  if (opts.pendingOnly) {
    sql += " AND resolution_status = 'pending'";
  }
  sql += " ORDER BY created_at DESC";
  if (opts.limit) {
    sql += " LIMIT ?";
    args.push(opts.limit);
  }
  const rows = await query(sql, args);
  return rows.map(rowToIncoherence);
}

export async function listIncoherencesForEntity(
  entityType: string,
  entityId: string,
): Promise<Incoherence[]> {
  const rows = await query(
    `SELECT ${COLS} FROM incoherences
     WHERE (source_entity_type = ? AND source_entity_id = ?)
        OR (conflicting_entity_type = ? AND conflicting_entity_id = ?)
     ORDER BY created_at DESC`,
    [entityType, entityId, entityType, entityId],
  );
  return rows.map(rowToIncoherence);
}

export async function markBriefedToUser(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  await execute(
    `UPDATE incoherences SET briefed_to_user_at = datetime('now')
     WHERE id IN (${placeholders})`,
    ids,
  );
}

export async function setResolutionStatus(
  missionId: string,
  id: string,
  status: IncoherenceResolutionStatus,
  resolvedBy: string = "paul",
): Promise<void> {
  await execute(
    `UPDATE incoherences
       SET resolution_status = ?, resolved_at = datetime('now'), resolved_by = ?
     WHERE id = ? AND mission_id = ?`,
    [status, resolvedBy, id, missionId],
  );
}

// ── Détection LLM ─────────────────────────────────────────────────────────

interface MissionState {
  activeDecisions: Array<{ id: string; statement: string; rationale: string | null; weekId: number | null }>;
  openTasks: Array<{ id: string; label: string; weekId: number; status: string }>;
  livrables: Array<{ id: string; label: string; weekId: number; status: string; deliveryDate: string | null }>;
  activeRisks: Array<{ id: string; label: string; impact: number; probability: number }>;
  weeks: Array<{ id: number; phase: string; title: string; startDate: string | null; endDate: string | null }>;
}

async function snapshotMission(missionId: string): Promise<MissionState> {
  const decisions = await query(
    `SELECT id, statement, rationale, week_id FROM decisions
     WHERE mission_id = ? AND status IN ('actée','révisée') ORDER BY acted_at DESC LIMIT 30`,
    [missionId],
  );
  const tasks = await query(
    `SELECT id, label, week_id, status FROM tasks
     WHERE mission_id = ? AND status != 'fait' ORDER BY week_id LIMIT 60`,
    [missionId],
  );
  const livrables = await query(
    `SELECT id, label, week_id, status, delivery_date FROM livrables
     WHERE mission_id = ? ORDER BY week_id`,
    [missionId],
  );
  const risks = await query(
    `SELECT id, label, impact, probability FROM risks
     WHERE mission_id = ? AND status = 'actif' ORDER BY impact*probability DESC`,
    [missionId],
  );
  const weeks = await query(
    `SELECT id, phase, title, start_date, end_date FROM weeks
     WHERE mission_id = ? ORDER BY id`,
    [missionId],
  );

  return {
    activeDecisions: decisions.map((r) => ({
      id: String(r.id),
      statement: String(r.statement),
      rationale: (r.rationale as string | null) ?? null,
      weekId: (r.week_id as number | null) ?? null,
    })),
    openTasks: tasks.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      weekId: Number(r.week_id),
      status: String(r.status),
    })),
    livrables: livrables.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      weekId: Number(r.week_id),
      status: String(r.status),
      deliveryDate: (r.delivery_date as string | null) ?? null,
    })),
    activeRisks: risks.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      impact: Number(r.impact),
      probability: Number(r.probability),
    })),
    weeks: weeks.map((r) => ({
      id: Number(r.id),
      phase: String(r.phase),
      title: String(r.title),
      startDate: (r.start_date as string | null) ?? null,
      endDate: (r.end_date as string | null) ?? null,
    })),
  };
}

function buildDetectionPrompt(
  state: MissionState,
  changed: { entityType: string; entityId: string; summary: string },
): string {
  return `Tu es un détecteur d'incohérences sur une mission de conseil.

ÉTAT ACTUEL DE LA MISSION (résumé) :

Semaines :
${state.weeks.map((w) => `- S${w.id} (${w.phase} — ${w.title}) ${w.startDate ?? ""} → ${w.endDate ?? ""}`).join("\n")}

Décisions actives (max 30 plus récentes) :
${state.activeDecisions.map((d) => `- [${d.id}] S${d.weekId ?? "?"} : ${d.statement}${d.rationale ? ` — motifs : ${d.rationale}` : ""}`).join("\n") || "(aucune)"}

Tâches ouvertes :
${state.openTasks.map((t) => `- [${t.id}] S${t.weekId} ${t.label} [${t.status}]`).join("\n") || "(aucune)"}

Livrables :
${state.livrables.map((l) => `- [${l.id}] S${l.weekId} ${l.label} [${l.status}]${l.deliveryDate ? ` livraison ${l.deliveryDate}` : ""}`).join("\n") || "(aucun)"}

Risques actifs :
${state.activeRisks.map((r) => `- [${r.id}] ${r.label} (I${r.impact}×P${r.probability})`).join("\n") || "(aucun)"}

NOUVEL INPUT qui vient d'entrer dans la mission :
- Type : ${changed.entityType}
- ID : ${changed.entityId}
- Résumé : ${changed.summary}

QUESTION : Ce nouvel input entre-t-il en contradiction avec un élément existant ?

4 types d'incohérences possibles :
- factual : l'input dit X alors que l'état dit non-X (ex : livrable "fini" mais statut "en cours")
- scope_drift : l'input demande quelque chose hors périmètre initial
- constraint_change : une contrainte bouge (deadline, budget, effectif, accès data)
- hypothesis_invalidated : une hypothèse de travail s'effondre

3 niveaux de sévérité :
- minor : impact limité, pas bloquant
- moderate : impact réel, nécessite une décision
- major : impact sur deadline/périmètre/budget, doit être remonté

Si tu détectes une ou plusieurs incohérences, retourne un tableau JSON.
Si tu n'en détectes aucune, retourne [].

N'INVENTE RIEN. Si tu n'es pas sûr, retourne [] plutôt qu'une fausse alerte.

Format (strict, sans backticks) :
[
  {
    "kind": "factual|scope_drift|constraint_change|hypothesis_invalidated",
    "severity": "minor|moderate|major",
    "description": "description courte du conflit",
    "conflicting_entity_type": "task|risk|livrable|decision|week|document",
    "conflicting_entity_id": "id de l'entité en conflit (ex: task-xxx)",
    "auto_resolution": "action proposée par l'agent, ou null si l'utilisateur doit trancher"
  }
]`;
}

export interface DetectParams {
  missionId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  summary: string;
  /** ID de la génération LLM qui a produit l'input (pour trace). */
  triggerGenerationId?: string;
  /** ID d'un message WhatsApp (à remplir au chantier 7). */
  sourceMessageId?: string;
}

interface DetectedRaw {
  kind: IncoherenceKind;
  severity?: IncoherenceSeverity;
  description: string;
  conflicting_entity_type: string;
  conflicting_entity_id: string;
  auto_resolution?: string | null;
}

export async function detectIncoherences(
  params: DetectParams,
): Promise<Incoherence[]> {
  const state = await snapshotMission(params.missionId);
  const prompt = buildDetectionPrompt(state, {
    entityType: params.sourceEntityType,
    entityId: params.sourceEntityId,
    summary: params.summary,
  });

  let llmResult;
  try {
    llmResult = await callLLMWithUsage(prompt, 1500);
  } catch {
    // Pas de détection = pas d'incohérence remontée. Mieux qu'un crash.
    return [];
  }

  await logTokenUsage({
    missionId: params.missionId,
    generationId: params.triggerGenerationId ?? null,
    route: "incoherences/detect",
    model: llmResult.model,
    usage: llmResult.usage,
    triggeredBy: "auto",
  });

  let parsed: DetectedRaw[] = [];
  try {
    const maybe = parseJSON<unknown>(llmResult.text);
    if (Array.isArray(maybe)) parsed = maybe as DetectedRaw[];
  } catch {
    return [];
  }

  const created: Incoherence[] = [];
  for (const p of parsed) {
    if (!p?.kind || !p?.description || !p?.conflicting_entity_type) continue;
    const id = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${created.length}`;
    await execute(
      `INSERT INTO incoherences
         (id, mission_id, kind, severity, description, source_entity_type,
          source_entity_id, source_message_id, conflicting_entity_type,
          conflicting_entity_id, auto_resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.missionId,
        p.kind,
        p.severity ?? "moderate",
        p.description,
        params.sourceEntityType,
        params.sourceEntityId,
        params.sourceMessageId ?? null,
        p.conflicting_entity_type,
        p.conflicting_entity_id,
        p.auto_resolution ?? null,
      ],
    );
    const rows = await query(
      `SELECT ${COLS} FROM incoherences WHERE id = ?`,
      [id],
    );
    if (rows[0]) {
      created.push(rowToIncoherence(rows[0]));
      // Journal agent unifié (chantier 7).
      try {
        const { logAgentAction } = await import("./agent-actions");
        await logAgentAction({
          missionId: params.missionId,
          actionType: "flag_incoherence",
          narrative: `⚠ ${p.severity ?? "moderate"} — ${p.description}`,
          reasoning: p.auto_resolution ?? null,
          targetEntityType: "incoherence",
          targetEntityId: id,
          sourceMessageId: params.sourceMessageId ?? null,
        });
      } catch {
        /* best-effort */
      }
    }
  }

  // Chantier 04 : déclencher une recalibration automatique si l'incohérence
  // la plus grave le justifie (shouldAutoRecalibrate). Un seul trigger par
  // batch de détection, sur l'incohérence la plus sévère — évite les
  // cascades infinies.
  if (created.length > 0) {
    try {
      const { shouldAutoRecalibrate, performRecalibration } = await import(
        "./recalibration"
      );
      const worst =
        created.find((i) => i.severity === "major") ??
        created.find((i) => i.kind === "constraint_change") ??
        created[0];
      const decision = shouldAutoRecalibrate(worst);
      if (decision.triggered) {
        // Best-effort : on récupère currentWeek depuis project k/v, fallback 1
        const cwRow = await query(
          "SELECT value FROM project WHERE key = 'current_week'",
        );
        const currentWeek = cwRow.length
          ? parseInt(cwRow[0].value as string, 10) || 1
          : 1;
        performRecalibration({
          missionId: params.missionId,
          currentWeek,
          scope: decision.scope,
          trigger: "auto_on_incoherence",
          triggerRef: worst.id,
        }).catch(() => {
          // Silent — revert reste disponible si quelque chose a été écrit.
        });
      }
    } catch {
      // recalibration module indisponible, on ignore
    }
  }

  return created;
}

/**
 * Lance une détection en arrière-plan via `waitUntil` si disponible (Vercel),
 * sinon en fire-and-forget classique. Ne bloque JAMAIS la requête appelante.
 */
export function kickOffDetection(params: DetectParams): void {
  const run = async () => {
    try {
      await detectIncoherences(params);
    } catch {
      // silencieux
    }
  };
  // Vercel Node runtime : waitUntil via globalThis
  const g = globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void };
  if (typeof g.waitUntil === "function") {
    g.waitUntil(run());
  } else {
    run();
  }
}
