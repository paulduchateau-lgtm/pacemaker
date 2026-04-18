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
}

/**
 * Capture les tâches futures non-faites qui seront supprimées par la
 * recalibration. Utilisé pour le revert.
 */
export async function snapshotFutureTasks(
  params: CaptureSnapshot,
): Promise<Snapshot> {
  const scopeCondition =
    params.scope === "single_week"
      ? "week_id = ?"
      : "week_id >= ?";
  const rows = await query(
    `SELECT id, week_id, label, description, owner, priority, status, source,
            jh_estime, livrables_generes, confidence, reasoning, created_at
     FROM tasks
     WHERE mission_id = ? AND ${scopeCondition} AND status != 'fait'`,
    [params.missionId, params.fromWeekId],
  );
  return {
    tasksDeleted: rows.map((r) => ({
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

interface RecalibResult {
  weeks: Record<string, { label: string; owner: string; priority: string; confidence?: number; reasoning?: string }[]>;
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
    { currentWeek, weeks, tasks, risks, events },
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

  // Snapshot avant modification (pour revert)
  const snapshot = await snapshotFutureTasks({
    missionId,
    fromWeekId: currentWeek,
    scope,
  });

  // Suppression : seulement les tâches en scope et non-faites
  const scopeCondition =
    scope === "single_week" ? "week_id = ?" : "week_id >= ?";
  await execute(
    `DELETE FROM tasks WHERE mission_id = ? AND ${scopeCondition} AND status != 'fait'`,
    [missionId, currentWeek],
  );

  // Insertion nouvelles tâches
  const insertedIds: string[] = [];
  for (const [weekIdStr, weekTasks] of Object.entries(recalib.weeks)) {
    const weekId = parseInt(weekIdStr, 10);
    // Pour downstream_only / single_week : ignore les weeks hors scope
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

  return {
    recalibrationId,
    tasksAdded: insertedIds.length,
    tasksRemoved: snapshot.tasksDeleted.length,
    carryoverNotes: recalib.carryover_notes,
    generationId,
  };
}

export async function revertRecalibration(
  missionId: string,
  id: string,
  revertedBy: string = "paul",
): Promise<{ restored: number; removed: number }> {
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

  await execute(
    `UPDATE recalibrations
       SET reverted_at = datetime('now'), reverted_by = ?
     WHERE id = ? AND mission_id = ?`,
    [revertedBy, id, missionId],
  );

  return { restored, removed };
}
