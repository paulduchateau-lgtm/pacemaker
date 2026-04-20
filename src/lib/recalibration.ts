import { execute, query } from "./db";
import { callLLMCached, parseJSON } from "./llm";
import { trackGeneration } from "./corrections";
import { buildRecalibrationPrompt } from "./prompts";
import { getRelevantContext } from "./rag";
import { getRelevantRules } from "./rules";
import { getMissionContext } from "./mission-context";
import { buildRecentChangesBlock } from "./recent-changes";
import { getCurrentWeek } from "./current-week";
import type { Incoherence } from "./incoherences";
import type { MissionEvent, Risk, Task, Week } from "@/types";

export type RecalibTrigger =
  | "manual"
  | "auto_on_incoherence"
  | "auto_on_input"
  | "scheduled";
export type RecalibScope = "full_plan" | "downstream_only" | "single_week";

export interface Recalibration {
  id: string;
  missionId: string;
  trigger: RecalibTrigger;
  triggerRef: string | null;
  scope: RecalibScope;
  changesSummary: string | null;
  snapshotBefore: string | null;
  insertedTaskIds: string[] | null;
  tasksAdded: number;
  tasksModified: number;
  tasksRemoved: number;
  currentWeek: number | null;
  reasoning: string | null;
  revertedAt: string | null;
  revertedBy: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

function rowToRecalib(r: Row): Recalibration {
  let insertedIds: string[] | null = null;
  if (r.inserted_task_ids) {
    try {
      const parsed = JSON.parse(r.inserted_task_ids as string);
      if (Array.isArray(parsed)) insertedIds = parsed as string[];
    } catch {
      /* ignore */
    }
  }
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    trigger: String(r.trigger) as RecalibTrigger,
    triggerRef: (r.trigger_ref as string | null) ?? null,
    scope: String(r.scope) as RecalibScope,
    changesSummary: (r.changes_summary as string | null) ?? null,
    snapshotBefore: (r.snapshot_before as string | null) ?? null,
    insertedTaskIds: insertedIds,
    tasksAdded: Number(r.tasks_added ?? 0),
    tasksModified: Number(r.tasks_modified ?? 0),
    tasksRemoved: Number(r.tasks_removed ?? 0),
    currentWeek: (r.current_week as number | null) ?? null,
    reasoning: (r.reasoning as string | null) ?? null,
    revertedAt: (r.reverted_at as string | null) ?? null,
    revertedBy: (r.reverted_by as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

const COLS =
  "id, mission_id, trigger, trigger_ref, scope, changes_summary, snapshot_before, inserted_task_ids, tasks_added, tasks_modified, tasks_removed, current_week, reasoning, reverted_at, reverted_by, created_at";

export async function listRecalibrations(
  missionId: string,
  limit: number = 50,
): Promise<Recalibration[]> {
  const rows = await query(
    `SELECT ${COLS} FROM recalibrations WHERE mission_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [missionId, limit],
  );
  return rows.map(rowToRecalib);
}

export async function getRecalibration(
  missionId: string,
  id: string,
): Promise<Recalibration | null> {
  const rows = await query(
    `SELECT ${COLS} FROM recalibrations WHERE id = ? AND mission_id = ? LIMIT 1`,
    [id, missionId],
  );
  return rows[0] ? rowToRecalib(rows[0]) : null;
}

/**
 * Heuristique de déclenchement automatique. `auto_on_input` reste prudent :
 * on ne relance une recalibration downstream que sur incohérence majeure
 * ou changement de contrainte (plan v0.1.1, règle 4 du prompt d'amorçage).
 */
export function shouldAutoRecalibrate(inc: Incoherence): {
  triggered: boolean;
  scope: RecalibScope;
  reason: string;
} {
  if (inc.severity === "major") {
    return {
      triggered: true,
      scope: "downstream_only",
      reason: `Incohérence majeure (${inc.kind})`,
    };
  }
  if (inc.kind === "constraint_change") {
    return {
      triggered: true,
      scope: "downstream_only",
      reason: "Changement de contrainte",
    };
  }
  if (inc.kind === "scope_drift" && inc.severity === "moderate") {
    return {
      triggered: true,
      scope: "downstream_only",
      reason: "Scope drift modéré",
    };
  }
  return {
    triggered: false,
    scope: "downstream_only",
    reason: "Sévérité/type sous le seuil",
  };
}

export interface CaptureSnapshot {
  missionId: string;
  fromWeekId: number;
  scope: RecalibScope;
}

export interface Snapshot {
  tasksDeleted: Array<{
    id: string;
    week_id: number;
    label: string;
    description: string;
    owner: string;
    priority: string;
    status: string;
    source: string;
    jh_estime: number | null;
    livrables_generes: string | null;
    confidence: number | null;
    reasoning: string | null;
    created_at: string;
  }>;
  livrablesBefore: Array<{
    id: string;
    week_id: number;
    label: string;
    status: string;
    delivery_date: string | null;
  }>;
  rapportsBefore: Array<{
    id: string;
    week_id: number | null;
    label: string;
    etat: string;
    complexite: string;
    lot: number;
  }>;
  weeksBefore: Array<{
    id: number;
    title: string;
    phase: string;
    budget_jh: number;
    actions: string;
    livrables_plan: string;
  }>;
}

/**
 * Capture les tâches, livrables et rapports qui seront supprimés/modifiés
 * par la recalibration. Utilisé pour un revert complet.
 *
 * - `full_plan`     : snapshot toutes les tasks non-faites + tous les livrables + tous les rapports de la mission.
 * - `downstream_only` : tasks non-faites + livrables + rapports des semaines ≥ fromWeekId.
 * - `single_week`   : idem mais uniquement la semaine fromWeekId.
 */
export async function snapshotForRecalibration(
  params: CaptureSnapshot,
): Promise<Snapshot> {
  const taskCondition =
    params.scope === "full_plan"
      ? ""
      : params.scope === "single_week"
        ? "AND week_id = ?"
        : "AND week_id >= ?";
  const livrableCondition =
    params.scope === "full_plan"
      ? ""
      : params.scope === "single_week"
        ? "AND week_id = ?"
        : "AND week_id >= ?";
  const rapportCondition =
    params.scope === "full_plan"
      ? ""
      : params.scope === "single_week"
        ? "AND week_id = ?"
        : "AND (week_id >= ? OR week_id IS NULL)";

  const taskArgs: (string | number)[] = [params.missionId];
  if (params.scope !== "full_plan") taskArgs.push(params.fromWeekId);
  const livrableArgs: (string | number)[] = [params.missionId];
  if (params.scope !== "full_plan") livrableArgs.push(params.fromWeekId);
  const rapportArgs: (string | number)[] = [params.missionId];
  if (params.scope !== "full_plan") rapportArgs.push(params.fromWeekId);

  const taskRows = await query(
    `SELECT id, week_id, label, description, owner, priority, status, source,
            jh_estime, livrables_generes, confidence, reasoning, created_at
     FROM tasks
     WHERE mission_id = ? AND status != 'fait' ${taskCondition}`,
    taskArgs,
  );
  const livrableRows = await query(
    `SELECT id, week_id, label, status, delivery_date
     FROM livrables WHERE mission_id = ? ${livrableCondition}`,
    livrableArgs,
  );
  const rapportRows = await query(
    `SELECT id, week_id, label, etat, complexite, lot
     FROM rapports WHERE mission_id = ? ${rapportCondition}`,
    rapportArgs,
  );

  return {
    tasksDeleted: taskRows.map((r) => ({
      id: String(r.id),
      week_id: Number(r.week_id),
      label: String(r.label),
      description: String(r.description ?? ""),
      owner: String(r.owner),
      priority: String(r.priority),
      status: String(r.status),
      source: String(r.source),
      jh_estime: (r.jh_estime as number | null) ?? null,
      livrables_generes: (r.livrables_generes as string | null) ?? null,
      confidence: (r.confidence as number | null) ?? null,
      reasoning: (r.reasoning as string | null) ?? null,
      created_at: String(r.created_at),
    })),
    livrablesBefore: livrableRows.map((r) => ({
      id: String(r.id),
      week_id: Number(r.week_id),
      label: String(r.label),
      status: String(r.status),
      delivery_date: (r.delivery_date as string | null) ?? null,
    })),
    rapportsBefore: rapportRows.map((r) => ({
      id: String(r.id),
      week_id: (r.week_id as number | null) ?? null,
      label: String(r.label),
      etat: String(r.etat),
      complexite: String(r.complexite),
      lot: Number(r.lot),
    })),
    weeksBefore: await (async () => {
      // Toujours snapshoter le descriptif des semaines dans le scope — le
      // LLM peut les renommer/restructurer via week_changes (chantier refonte).
      const weekCondition =
        params.scope === "full_plan"
          ? ""
          : params.scope === "single_week"
            ? "AND id = ?"
            : "AND id >= ?";
      const wargs: (string | number)[] = [params.missionId];
      if (params.scope !== "full_plan") wargs.push(params.fromWeekId);
      const weekRows = await query(
        `SELECT id, title, phase, budget_jh, actions, livrables_plan
         FROM weeks WHERE mission_id = ? ${weekCondition}`,
        wargs,
      );
      return weekRows.map((r) => ({
        id: Number(r.id),
        title: String(r.title),
        phase: String(r.phase),
        budget_jh: Number(r.budget_jh),
        actions: String(r.actions),
        livrables_plan: String(r.livrables_plan),
      }));
    })(),
  };
}

export async function persistRecalibration(params: {
  missionId: string;
  trigger: RecalibTrigger;
  triggerRef?: string | null;
  scope: RecalibScope;
  changesSummary: string | null;
  snapshot: Snapshot;
  insertedTaskIds: string[];
  currentWeek: number;
  reasoning?: string | null;
}): Promise<string> {
  const id = `recal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO recalibrations
       (id, mission_id, trigger, trigger_ref, scope, changes_summary,
        snapshot_before, inserted_task_ids,
        tasks_added, tasks_removed, current_week, reasoning)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.missionId,
      params.trigger,
      params.triggerRef ?? null,
      params.scope,
      params.changesSummary,
      JSON.stringify(params.snapshot),
      JSON.stringify(params.insertedTaskIds),
      params.insertedTaskIds.length,
      params.snapshot.tasksDeleted.length,
      params.currentWeek,
      params.reasoning ?? null,
    ],
  );
  return id;
}

/**
 * Soft revert : restaure les tâches du snapshot, supprime celles créées par
 * la recalibration, marque la ligne recalibrations comme revertée.
 */
// ── Exécution effective d'une recalibration ───────────────────────────────

interface LivrableChange {
  id: string;
  new_week_id?: number | null;
  new_status?: string;
  new_delivery_date?: string | null;
  reason?: string;
}
interface RapportChange {
  id: string;
  new_week_id?: number | null;
  new_etat?: string;
  reason?: string;
}
interface WeekChange {
  id: number;
  new_title?: string;
  new_phase?: string;
  new_budget_jh?: number;
  new_actions?: string[];
  new_livrables_plan?: string[];
  reason?: string;
}
interface DetectedIncoherence {
  kind: "factual" | "scope_drift" | "constraint_change" | "hypothesis_invalidated";
  severity?: "minor" | "moderate" | "major";
  description: string;
  conflicting_entity_type: string;
  conflicting_entity_id: string;
  auto_resolution?: string | null;
}
interface RecalibResult {
  weeks: Record<string, { label: string; owner: string; priority: string; confidence?: number; reasoning?: string }[]>;
  week_changes?: WeekChange[];
  livrable_changes?: LivrableChange[];
  rapport_changes?: RapportChange[];
  detected_incoherences?: DetectedIncoherence[];
  carryover_notes: string;
}

function mapTaskRow(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    weekId: r.week_id as number,
    label: r.label as string,
    description: (r.description as string) || "",
    owner: r.owner as Task["owner"],
    priority: r.priority as Task["priority"],
    status: r.status as Task["status"],
    source: r.source as Task["source"],
    createdAt: r.created_at as string,
    completedAt: (r.completed_at as string) || null,
  };
}

export interface PerformRecalibParams {
  missionId: string;
  currentWeek: number;
  scope: RecalibScope;
  trigger: RecalibTrigger;
  triggerRef?: string | null;
}

export async function performRecalibration(
  params: PerformRecalibParams,
): Promise<{
  recalibrationId: string;
  tasksAdded: number;
  tasksRemoved: number;
  livrablesChanged: number;
  rapportsChanged: number;
  carryoverNotes: string;
  generationId: string;
}> {
  const { missionId, currentWeek, scope, trigger, triggerRef } = params;
  const tStart = Date.now();
  console.log(
    `[recalib] START mission=${missionId} currentWeek=${currentWeek} scope=${scope} trigger=${trigger} triggerRef=${triggerRef ?? "—"}`,
  );

  // Chargement du contexte mission
  const weekRows = await query(
    "SELECT * FROM weeks WHERE mission_id = ? ORDER BY id",
    [missionId],
  );
  const weeks: Week[] = weekRows.map((w) => ({
    id: w.id as number,
    phase: w.phase as Week["phase"],
    title: w.title as string,
    budget_jh: w.budget_jh as number,
    actions: JSON.parse(w.actions as string),
    livrables: JSON.parse(w.livrables_plan as string),
    owner: w.owner as string,
    startDate: (w.start_date as string) || null,
    endDate: (w.end_date as string) || null,
    baselineStartDate: (w.baseline_start_date as string) || null,
    baselineEndDate: (w.baseline_end_date as string) || null,
  }));

  const taskRows = await query(
    "SELECT * FROM tasks WHERE mission_id = ?",
    [missionId],
  );
  const tasks: Task[] = taskRows.map(mapTaskRow);

  const riskRows = await query(
    "SELECT * FROM risks WHERE mission_id = ?",
    [missionId],
  );
  const risks: Risk[] = riskRows.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    impact: r.impact as number,
    probability: r.probability as number,
    status: r.status as Risk["status"],
    mitigation: r.mitigation as string,
  }));

  const eventRows = await query(
    "SELECT * FROM events WHERE mission_id = ? ORDER BY date DESC LIMIT 50",
    [missionId],
  );
  const events: MissionEvent[] = eventRows.map((r) => ({
    id: r.id as string,
    type: r.type as MissionEvent["type"],
    label: r.label as string,
    weekId: r.week_id as number,
    date: r.date as string,
    content: r.content as string,
  }));

  // Chantier refonte : décisions, livrables, rapports sont maintenant injectés
  // dans le prompt (avant ils manquaient → le LLM ne voyait pas la contrainte).
  // Chantier 4 : LIMIT 40 → 15 (les plus récentes, les anciennes sont supposées
  // déjà absorbées dans le plan et accessibles via RAG si besoin). Gain ~600
  // tokens input par recalibration.
  const decisionRows = await query(
    `SELECT id, statement, rationale, week_id FROM decisions
     WHERE mission_id = ? AND status IN ('actée','révisée','proposée')
     ORDER BY acted_at DESC LIMIT 15`,
    [missionId],
  );
  const decisions = decisionRows.map((r) => ({
    id: String(r.id),
    statement: String(r.statement),
    rationale: (r.rationale as string | null) ?? null,
    weekId: (r.week_id as number | null) ?? null,
  }));

  const livrableRows = await query(
    `SELECT id, week_id, label, status, delivery_date FROM livrables
     WHERE mission_id = ? ORDER BY week_id`,
    [missionId],
  );
  const livrables = livrableRows.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    weekId: Number(r.week_id),
    status: String(r.status),
    deliveryDate: (r.delivery_date as string | null) ?? null,
  }));

  const rapportRows = await query(
    `SELECT id, week_id, label, etat, complexite, lot FROM rapports
     WHERE mission_id = ? ORDER BY COALESCE(week_id, 99), lot`,
    [missionId],
  );
  const rapports = rapportRows.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    weekId: (r.week_id as number | null) ?? null,
    lot: Number(r.lot),
    etat: String(r.etat),
    complexite: String(r.complexite),
  }));

  // Chantier 4 (audit LLM) : on ne passe plus l'index exhaustif des documents
  // au LLM. Le RAG ci-dessous (seuil élargi 0.65, limit 12) fait le travail
  // de récupération des chunks pertinents avec leur titre de doc en préfixe.
  // Gain mesuré : ~2500 tokens input par recalibration.

  // Préparation du prompt
  const ragContext = await getRelevantContext(
    `recalibration semaine ${currentWeek} ${scope}`,
    { missionId, threshold: 0.65, limit: 12 },
  );
  const rules = await getRelevantRules(
    "recalib",
    { currentWeek, scope },
    { missionId },
  );
  const missionContext = await getMissionContext({ missionId });
  const recent = await buildRecentChangesBlock({ missionId });

  const { system, user } = buildRecalibrationPrompt(
    {
      currentWeek,
      weeks,
      tasks,
      risks,
      events,
      decisions,
      livrables,
      rapports,
      scope,
    },
    ragContext,
    rules,
    missionContext,
    recent.block,
  );

  console.log(
    `[recalib] CONTEXT decisions=${decisions.length} livrables=${livrables.length} rapports=${rapports.length} tasks=${tasks.length} risks=${risks.length} events=${events.length} rules=${rules.length} missionCtx=${missionContext.length}c ragCtx=${ragContext.length}c recentChanges=${recent.itemCount}items systemSize=${system.length}c userSize=${user.length}c`,
  );
  console.log(
    `[recalib] RECENT_CHANGES since=${recent.sinceIso} items=${recent.itemCount}`,
  );
  if (decisions.length > 0) {
    console.log(
      "[recalib] DECISIONS injected:",
      decisions
        .map((d) => `[${d.id}] S${d.weekId ?? "?"} ${d.statement.slice(0, 60)}`)
        .join(" | "),
    );
  }
  // Échantillon fin du prompt user : les données fraîches.
  const FRESH_PREVIEW = 1500;
  const freshSection = user.slice(
    Math.max(0, user.indexOf("État complet du projet")),
  );
  console.log(
    `[recalib] USER fresh-state (${FRESH_PREVIEW}c): ${freshSection.slice(0, FRESH_PREVIEW)}`,
  );
  if (recent.itemCount > 0) {
    const recentIdx = user.indexOf("=== DONNÉES MODIFIÉES");
    if (recentIdx >= 0) {
      const endIdx = user.indexOf("=== FIN CHANGEMENTS", recentIdx);
      console.log(
        `[recalib] RECENT_CHANGES block:\n${user.slice(recentIdx, endIdx > 0 ? endIdx + 60 : recentIdx + 2000)}`,
      );
    }
  }
  if (process.env.RECALIB_DEBUG === "1") {
    console.log(`[recalib] SYSTEM FULL:\n${system}\n\n[recalib] USER FULL:\n${user}`);
  }

  // Appel LLM avec prompt caching (system cachable 5 min côté Anthropic).
  const { text: result, usage, model } = await callLLMCached(system, user, 4000);
  console.log(
    `[recalib] LLM done in=${usage.inputTokens}tk out=${usage.outputTokens}tk cacheWrite=${usage.cacheCreationTokens ?? 0}tk cacheRead=${usage.cacheReadTokens ?? 0}tk model=${model} t=${Date.now() - tStart}ms`,
  );
  console.log(`[recalib] OUTPUT head (500c): ${result.slice(0, 500)}`);

  const generationId = await trackGeneration({
    generationType: "recalib",
    context: { currentWeek, scope, trigger, triggerRef: triggerRef ?? null },
    prompt: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`,
    rawOutput: result,
    appliedRuleIds: rules.map((r) => r.id),
    weekId: currentWeek,
    missionId,
    usage,
    model,
    route: `recalibration/${trigger}`,
    triggeredBy: trigger === "manual" ? "user" : "auto",
  });

  let recalib: RecalibResult;
  try {
    recalib = parseJSON<RecalibResult>(result);
  } catch {
    // LLM n'a pas renvoyé de JSON valide — on abandonne sans rien modifier
    throw new Error("Recalibration : format JSON invalide renvoyé par le LLM");
  }

  // Snapshot avant modification (pour revert) — inclut tasks + livrables + rapports.
  const snapshot = await snapshotForRecalibration({
    missionId,
    fromWeekId: currentWeek,
    scope,
  });

  // Suppression des tâches non-faites dans le scope.
  // En full_plan : TOUTES les non-faites (permet de déplacer des tâches de S1
  // en S3 par exemple, si une décision rétroactive le demande).
  if (scope === "full_plan") {
    await execute(
      `DELETE FROM tasks WHERE mission_id = ? AND status != 'fait'`,
      [missionId],
    );
  } else {
    const scopeCondition =
      scope === "single_week" ? "week_id = ?" : "week_id >= ?";
    await execute(
      `DELETE FROM tasks WHERE mission_id = ? AND ${scopeCondition} AND status != 'fait'`,
      [missionId, currentWeek],
    );
  }

  // Insertion nouvelles tâches
  const insertedIds: string[] = [];
  for (const [weekIdStr, weekTasks] of Object.entries(recalib.weeks)) {
    const weekId = parseInt(weekIdStr, 10);
    // Pour downstream_only / single_week : ignore les weeks hors scope.
    // En full_plan on accepte n'importe quelle semaine existante.
    if (scope === "downstream_only" && weekId < currentWeek) continue;
    if (scope === "single_week" && weekId !== currentWeek) continue;
    for (const t of weekTasks) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${insertedIds.length}`;
      await execute(
        `INSERT INTO tasks
           (id, week_id, label, owner, priority, source, mission_id, confidence, reasoning)
         VALUES (?, ?, ?, ?, ?, 'recalib', ?, ?, ?)`,
        [
          id,
          weekId,
          t.label,
          t.owner,
          t.priority,
          missionId,
          typeof t.confidence === "number" ? t.confidence : null,
          t.reasoning ?? null,
        ],
      );
      insertedIds.push(id);
    }
  }

  // Application des changements livrables / rapports renvoyés par le LLM
  const livrableChangesApplied: string[] = [];
  if (Array.isArray(recalib.livrable_changes)) {
    for (const c of recalib.livrable_changes) {
      if (!c?.id) continue;
      const sets: string[] = [];
      const args: unknown[] = [];
      if (c.new_week_id !== undefined) {
        sets.push("week_id = ?");
        args.push(c.new_week_id);
      }
      if (typeof c.new_status === "string") {
        sets.push("status = ?");
        args.push(c.new_status);
      }
      if (c.new_delivery_date !== undefined) {
        sets.push("delivery_date = ?");
        args.push(c.new_delivery_date);
      }
      if (sets.length === 0) continue;
      args.push(c.id, missionId);
      await execute(
        `UPDATE livrables SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
        args as import("@libsql/client").InValue[],
      );
      livrableChangesApplied.push(c.id);
    }
  }

  const rapportChangesApplied: string[] = [];
  if (Array.isArray(recalib.rapport_changes)) {
    for (const c of recalib.rapport_changes) {
      if (!c?.id) continue;
      const sets: string[] = [];
      const args: unknown[] = [];
      if (c.new_week_id !== undefined) {
        sets.push("week_id = ?");
        args.push(c.new_week_id);
      }
      if (typeof c.new_etat === "string") {
        sets.push("etat = ?");
        args.push(c.new_etat);
      }
      if (sets.length === 0) continue;
      args.push(c.id, missionId);
      await execute(
        `UPDATE rapports SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
        args as import("@libsql/client").InValue[],
      );
      rapportChangesApplied.push(c.id);
    }
  }

  // Chantier refonte : modifier le descriptif d'une semaine (title / phase /
  // budget / actions / livrables_plan) si une décision rend caduque sa
  // définition initiale. Ex: S4 devient "AST — Conception" après une
  // décision "focus AST S1-S5".
  const weekChangesApplied: number[] = [];
  if (Array.isArray(recalib.week_changes)) {
    for (const c of recalib.week_changes) {
      if (typeof c?.id !== "number") continue;
      const sets: string[] = [];
      const args: unknown[] = [];
      if (typeof c.new_title === "string" && c.new_title.trim()) {
        sets.push("title = ?");
        args.push(c.new_title.trim());
      }
      if (typeof c.new_phase === "string" && c.new_phase.trim()) {
        sets.push("phase = ?");
        args.push(c.new_phase.trim());
      }
      if (typeof c.new_budget_jh === "number") {
        sets.push("budget_jh = ?");
        args.push(c.new_budget_jh);
      }
      if (Array.isArray(c.new_actions)) {
        sets.push("actions = ?");
        args.push(JSON.stringify(c.new_actions));
      }
      if (Array.isArray(c.new_livrables_plan)) {
        sets.push("livrables_plan = ?");
        args.push(JSON.stringify(c.new_livrables_plan));
      }
      if (sets.length === 0) continue;
      args.push(c.id, missionId);
      await execute(
        `UPDATE weeks SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
        args as import("@libsql/client").InValue[],
      );
      weekChangesApplied.push(c.id);
    }
  }

  // Persist recalibration row
  const recalibrationId = await persistRecalibration({
    missionId,
    trigger,
    triggerRef: triggerRef ?? null,
    scope,
    changesSummary: recalib.carryover_notes,
    snapshot,
    insertedTaskIds: insertedIds,
    currentWeek,
    reasoning: recalib.carryover_notes,
  });

  // Incohérences détectées par le LLM pendant la recalibration (fusion avec
  // l'ancien module detectIncoherences : même UI, même lifecycle, mais sans
  // second appel LLM).
  let incoherencesInserted = 0;
  if (Array.isArray(recalib.detected_incoherences)) {
    for (const inc of recalib.detected_incoherences) {
      if (!inc?.kind || !inc?.description || !inc?.conflicting_entity_type) continue;
      const incId = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${incoherencesInserted}`;
      await execute(
        `INSERT INTO incoherences
           (id, mission_id, kind, severity, description, source_entity_type,
            source_entity_id, conflicting_entity_type, conflicting_entity_id,
            auto_resolution)
         VALUES (?, ?, ?, ?, ?, 'recalibration', ?, ?, ?, ?)`,
        [
          incId,
          missionId,
          inc.kind,
          inc.severity ?? "moderate",
          inc.description,
          recalibrationId,
          inc.conflicting_entity_type,
          inc.conflicting_entity_id,
          inc.auto_resolution ?? null,
        ],
      );
      incoherencesInserted++;
    }
  }

  // Event dans le journal mission
  const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO events (id, type, label, week_id, content, mission_id)
     VALUES (?, 'recalib', ?, ?, ?, ?)`,
    [
      evtId,
      `Recalibration ${trigger === "manual" ? "manuelle" : "auto"} (${scope}) à S${currentWeek}`,
      currentWeek,
      recalib.carryover_notes,
      missionId,
    ],
  );

  // Journal agent unifié (chantier 7) — reversible via revertRecalibration.
  try {
    const { logAgentAction } = await import("./agent-actions");
    await logAgentAction({
      missionId,
      actionType: "recalibrate_plan",
      narrative: `Plan recalibré (${scope}) à S${currentWeek} — +${insertedIds.length}/−${snapshot.tasksDeleted.length} tâches`,
      reasoning: recalib.carryover_notes,
      targetEntityType: "recalibration",
      targetEntityId: recalibrationId,
    });
  } catch {
    /* best-effort */
  }

  // Chantier 8 : trace le temps gagné (médianes validées).
  try {
    const { logTimeSaving } = await import("./time-savings");
    await logTimeSaving({
      missionId,
      activity:
        trigger === "manual" ? "recalibration_manual" : "recalibration_auto",
      sourceEntityType: "recalibration",
      sourceEntityId: recalibrationId,
    });
  } catch {
    /* best-effort */
  }

  const outcome = {
    recalibrationId,
    tasksAdded: insertedIds.length,
    tasksRemoved: snapshot.tasksDeleted.length,
    livrablesChanged: livrableChangesApplied.length,
    rapportsChanged: rapportChangesApplied.length,
    carryoverNotes: recalib.carryover_notes,
    generationId,
  };
  console.log(
    `[recalib] END tasks=+${outcome.tasksAdded}/-${outcome.tasksRemoved} livrables_changed=${outcome.livrablesChanged} rapports_changed=${outcome.rapportsChanged} weeks_changed=${weekChangesApplied.length} incoherences_flagged=${incoherencesInserted} totalMs=${Date.now() - tStart}`,
  );
  return outcome;
}

// ── Auto-trigger avec debounce par mission ────────────────────────────────

const AUTO_DEBOUNCE_MS = 30_000;
const lastAutoTrigger = new Map<string, number>();

/**
 * Déclenche une recalibration automatique.
 *
 * Par défaut, fire-and-forget avec debounce 30s par mission (évite les
 * cascades quand plusieurs événements arrivent d'un coup).
 *
 * Si `wait=true`, la recalibration est exécutée EN SYNCHRONE (bypass
 * debounce) et l'appelant attend le résultat. À utiliser quand l'UX
 * consommateur veut voir le plan mis à jour en fin de requête (ex: POST
 * /api/decisions + form qui affiche "RECALIBRATION EN COURS (20-30s)").
 */
export async function kickOffAutoRecalibration(params: {
  missionId: string;
  scope: RecalibScope;
  trigger: Exclude<RecalibTrigger, "manual">;
  triggerRef?: string | null;
  wait?: boolean;
}): Promise<{ ran: boolean; recalibrationId?: string }> {
  if (!params.wait) {
    const now = Date.now();
    const last = lastAutoTrigger.get(params.missionId) ?? 0;
    if (now - last < AUTO_DEBOUNCE_MS) return { ran: false };
    lastAutoTrigger.set(params.missionId, now);
  } else {
    // En mode synchrone, on marque quand même le timestamp pour que les
    // triggers async qui suivent ne doublonnent pas.
    lastAutoTrigger.set(params.missionId, Date.now());
  }

  // Scoped par mission pour éviter que la dernière mission visitée n'écrase
  // la semaine courante des autres (cf. lib/current-week.ts).
  const currentWeek = await getCurrentWeek(params.missionId);

  if (params.wait) {
    try {
      const result = await performRecalibration({
        missionId: params.missionId,
        currentWeek,
        scope: params.scope,
        trigger: params.trigger,
        triggerRef: params.triggerRef ?? null,
      });
      return { ran: true, recalibrationId: result.recalibrationId };
    } catch (err) {
      console.error("[kickOffAutoRecalibration sync] failed:", err);
      return { ran: false };
    }
  }

  const run = async () => {
    try {
      await performRecalibration({
        missionId: params.missionId,
        currentWeek,
        scope: params.scope,
        trigger: params.trigger,
        triggerRef: params.triggerRef ?? null,
      });
    } catch (err) {
      console.error("[kickOffAutoRecalibration async] failed:", err);
    }
  };

  const g = globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void };
  if (typeof g.waitUntil === "function") {
    g.waitUntil(run());
  } else {
    run();
  }
  return { ran: true };
}

export async function revertRecalibration(
  missionId: string,
  id: string,
  revertedBy: string = "paul",
): Promise<{ restored: number; removed: number; livrablesRestored: number; rapportsRestored: number; weeksRestored: number }> {
  const recalib = await getRecalibration(missionId, id);
  if (!recalib) throw new Error("Recalibration introuvable");
  if (recalib.revertedAt) throw new Error("Recalibration déjà revertée");

  let snap: Snapshot | null = null;
  if (recalib.snapshotBefore) {
    try {
      snap = JSON.parse(recalib.snapshotBefore);
    } catch {
      snap = null;
    }
  }

  // 1) Supprimer les tâches créées par cette recalibration
  let removed = 0;
  if (recalib.insertedTaskIds?.length) {
    for (const tid of recalib.insertedTaskIds) {
      await execute(
        "DELETE FROM tasks WHERE id = ? AND mission_id = ?",
        [tid, missionId],
      );
      removed++;
    }
  }

  // 2) Restaurer les tâches supprimées avant recalibration
  let restored = 0;
  if (snap?.tasksDeleted?.length) {
    for (const t of snap.tasksDeleted) {
      await execute(
        `INSERT OR IGNORE INTO tasks
           (id, week_id, label, description, owner, priority, status, source,
            jh_estime, livrables_generes, confidence, reasoning, created_at, mission_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.week_id,
          t.label,
          t.description,
          t.owner,
          t.priority,
          t.status,
          t.source,
          t.jh_estime,
          t.livrables_generes,
          t.confidence,
          t.reasoning,
          t.created_at,
          missionId,
        ],
      );
      restored++;
    }
  }

  // 3) Restaurer les livrables modifiés (UPDATE, ils n'ont pas été supprimés)
  let livrablesRestored = 0;
  if (snap?.livrablesBefore?.length) {
    for (const l of snap.livrablesBefore) {
      await execute(
        `UPDATE livrables
           SET week_id = ?, status = ?, delivery_date = ?
         WHERE id = ? AND mission_id = ?`,
        [l.week_id, l.status, l.delivery_date, l.id, missionId],
      );
      livrablesRestored++;
    }
  }

  // 4) Restaurer les rapports modifiés
  let rapportsRestored = 0;
  if (snap?.rapportsBefore?.length) {
    for (const r of snap.rapportsBefore) {
      await execute(
        `UPDATE rapports SET week_id = ?, etat = ? WHERE id = ? AND mission_id = ?`,
        [r.week_id, r.etat, r.id, missionId],
      );
      rapportsRestored++;
    }
  }

  // 5) Restaurer le descriptif des semaines (chantier refonte)
  let weeksRestored = 0;
  if (snap?.weeksBefore?.length) {
    for (const w of snap.weeksBefore) {
      await execute(
        `UPDATE weeks
           SET title = ?, phase = ?, budget_jh = ?, actions = ?, livrables_plan = ?
         WHERE id = ? AND mission_id = ?`,
        [w.title, w.phase, w.budget_jh, w.actions, w.livrables_plan, w.id, missionId],
      );
      weeksRestored++;
    }
  }

  await execute(
    `UPDATE recalibrations
       SET reverted_at = datetime('now'), reverted_by = ?
     WHERE id = ? AND mission_id = ?`,
    [revertedBy, id, missionId],
  );

  return { restored, removed, livrablesRestored, rapportsRestored, weeksRestored };
}
