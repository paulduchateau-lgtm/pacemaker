import { execute, query } from "./db";
import { callLLMWithUsage, parseJSON } from "./llm";
import { trackGeneration } from "./corrections";
import { buildRecalibrationPrompt } from "./prompts";
import { getRelevantContext } from "./rag";
import { getRelevantRules } from "./rules";
import { getMissionContext } from "./mission-context";
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
  };
}

/** @deprecated — conservé pour backcompat interne. Utiliser snapshotForRecalibration. */
export const snapshotFutureTasks = snapshotForRecalibration;

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
interface RecalibResult {
  weeks: Record<string, { label: string; owner: string; priority: string; confidence?: number; reasoning?: string }[]>;
  livrable_changes?: LivrableChange[];
  rapport_changes?: RapportChange[];
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
  carryoverNotes: string;
  generationId: string;
}> {
  const { missionId, currentWeek, scope, trigger, triggerRef } = params;

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
  const decisionRows = await query(
    `SELECT id, statement, rationale, week_id FROM decisions
     WHERE mission_id = ? AND status IN ('actée','révisée','proposée')
     ORDER BY acted_at DESC LIMIT 40`,
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

  // Préparation du prompt
  const ragContext = await getRelevantContext(
    `recalibration semaine ${currentWeek} ${scope}`,
    { missionId },
  );
  const rules = await getRelevantRules(
    "recalib",
    { currentWeek, scope },
    { missionId },
  );
  const missionContext = await getMissionContext({ missionId });

  const prompt = buildRecalibrationPrompt(
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
  );

  // Appel LLM avec télémétrie
  const { text: result, usage, model } = await callLLMWithUsage(prompt, 4000);

  const generationId = await trackGeneration({
    generationType: "recalib",
    context: { currentWeek, scope, trigger, triggerRef: triggerRef ?? null },
    prompt,
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

  return {
    recalibrationId,
    tasksAdded: insertedIds.length,
    tasksRemoved: snapshot.tasksDeleted.length,
    carryoverNotes: recalib.carryover_notes,
    generationId,
  };
}

// ── Auto-trigger avec debounce par mission ────────────────────────────────

const AUTO_DEBOUNCE_MS = 30_000;
const lastAutoTrigger = new Map<string, number>();

/**
 * Déclenche une recalibration automatique en arrière-plan si aucune n'a
 * tourné dans les 30 dernières secondes pour cette mission. Évite les
 * cascades quand plusieurs événements arrivent d'un coup (ex: parse d'un
 * CR qui crée 3 décisions → 1 seule recalibration en sortie).
 */
export async function kickOffAutoRecalibration(params: {
  missionId: string;
  scope: RecalibScope;
  trigger: Exclude<RecalibTrigger, "manual">;
  triggerRef?: string | null;
}): Promise<void> {
  const now = Date.now();
  const last = lastAutoTrigger.get(params.missionId) ?? 0;
  if (now - last < AUTO_DEBOUNCE_MS) return;
  lastAutoTrigger.set(params.missionId, now);

  // Récupère currentWeek depuis project k/v (fallback 1).
  let currentWeek = 1;
  try {
    const rows = await query(
      "SELECT value FROM project WHERE key = 'current_week'",
    );
    if (rows[0]?.value) {
      const n = parseInt(String(rows[0].value), 10);
      if (Number.isFinite(n) && n > 0) currentWeek = n;
    }
  } catch {
    /* ignore */
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
    } catch {
      // Silencieux. L'utilisateur peut toujours relancer manuellement.
    }
  };

  const g = globalThis as unknown as { waitUntil?: (p: Promise<unknown>) => void };
  if (typeof g.waitUntil === "function") {
    g.waitUntil(run());
  } else {
    run();
  }
}

export async function revertRecalibration(
  missionId: string,
  id: string,
  revertedBy: string = "paul",
): Promise<{ restored: number; removed: number; livrablesRestored: number; rapportsRestored: number }> {
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

  await execute(
    `UPDATE recalibrations
       SET reverted_at = datetime('now'), reverted_by = ?
     WHERE id = ? AND mission_id = ?`,
    [revertedBy, id, missionId],
  );

  return { restored, removed, livrablesRestored, rapportsRestored };
}
