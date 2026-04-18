import { execute, query } from "./db";

/**
 * Journal unifié des actions autonomes de l'agent (option C du design doc).
 * Une ligne = une action narrative pointant vers une entité concrète ailleurs
 * (decisions, incoherences, recalibrations, tasks, livrables) ou purement
 * narrative (add_context, ask_user, noop).
 */

export type AgentActionType =
  | "create_task"
  | "update_task"
  | "update_deliverable"
  | "add_context"
  | "create_decision"
  | "flag_incoherence"
  | "recalibrate_plan"
  | "ask_user"
  | "noop";

export type AgentActionTargetEntity =
  | "task"
  | "livrable"
  | "decision"
  | "incoherence"
  | "recalibration"
  | "mission"
  | "document"
  | null;

export interface AgentAction {
  id: string;
  missionId: string;
  sourceMessageId: string | null;
  actionType: AgentActionType;
  targetEntityType: AgentActionTargetEntity;
  targetEntityId: string | null;
  narrative: string;
  reasoning: string | null;
  beforeState: string | null;
  afterState: string | null;
  confidence: number | null;
  revertedAt: string | null;
  revertedBy: string | null;
  createdAt: string;
}

type Row = Record<string, unknown>;

function rowToAction(r: Row): AgentAction {
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    sourceMessageId: (r.source_message_id as string | null) ?? null,
    actionType: String(r.action_type) as AgentActionType,
    targetEntityType:
      ((r.target_entity_type as string | null) ??
        null) as AgentActionTargetEntity,
    targetEntityId: (r.target_entity_id as string | null) ?? null,
    narrative: String(r.narrative),
    reasoning: (r.reasoning as string | null) ?? null,
    beforeState: (r.before_state as string | null) ?? null,
    afterState: (r.after_state as string | null) ?? null,
    confidence: (r.confidence as number | null) ?? null,
    revertedAt: (r.reverted_at as string | null) ?? null,
    revertedBy: (r.reverted_by as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

const COLS =
  "id, mission_id, source_message_id, action_type, target_entity_type, target_entity_id, narrative, reasoning, before_state, after_state, confidence, reverted_at, reverted_by, created_at";

export interface LogActionInput {
  missionId: string;
  actionType: AgentActionType;
  narrative: string;
  targetEntityType?: AgentActionTargetEntity;
  targetEntityId?: string | null;
  reasoning?: string | null;
  beforeState?: string | null;
  afterState?: string | null;
  confidence?: number | null;
  sourceMessageId?: string | null;
}

export async function logAgentAction(input: LogActionInput): Promise<string> {
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await execute(
      `INSERT INTO agent_actions
         (id, mission_id, source_message_id, action_type, target_entity_type,
          target_entity_id, narrative, reasoning, before_state, after_state,
          confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.missionId,
        input.sourceMessageId ?? null,
        input.actionType,
        input.targetEntityType ?? null,
        input.targetEntityId ?? null,
        input.narrative,
        input.reasoning ?? null,
        input.beforeState ?? null,
        input.afterState ?? null,
        typeof input.confidence === "number" ? input.confidence : null,
      ],
    );
  } catch {
    // Ne jamais bloquer le flux applicatif sur un échec de journalisation.
  }
  return id;
}

export async function listAgentActions(
  missionId: string,
  limit: number = 100,
): Promise<AgentAction[]> {
  const rows = await query(
    `SELECT ${COLS} FROM agent_actions WHERE mission_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [missionId, limit],
  );
  return rows.map(rowToAction);
}

export async function getAgentAction(
  missionId: string,
  id: string,
): Promise<AgentAction | null> {
  const rows = await query(
    `SELECT ${COLS} FROM agent_actions WHERE id = ? AND mission_id = ? LIMIT 1`,
    [id, missionId],
  );
  return rows[0] ? rowToAction(rows[0]) : null;
}

/**
 * Actions "mécaniques" reversibles — scope validé par Paul :
 *   create_task, update_task, update_deliverable, add_context,
 *   recalibrate_plan.
 * Les décisions, incohérences, questions utilisateur se gèrent via leurs
 * pages dédiées (cancelDecision, setResolutionStatus, etc.).
 */
export function isReversible(actionType: AgentActionType): boolean {
  return (
    actionType === "create_task" ||
    actionType === "update_task" ||
    actionType === "update_deliverable" ||
    actionType === "add_context" ||
    actionType === "recalibrate_plan"
  );
}

export async function revertAgentAction(
  missionId: string,
  id: string,
  revertedBy: string = "paul",
): Promise<{ ok: true; kind: AgentActionType } | { ok: false; error: string }> {
  const action = await getAgentAction(missionId, id);
  if (!action) return { ok: false, error: "Action introuvable" };
  if (action.revertedAt) return { ok: false, error: "Déjà revertée" };
  if (!isReversible(action.actionType)) {
    return {
      ok: false,
      error: `Action ${action.actionType} non reversible mécaniquement (à gérer depuis sa page dédiée)`,
    };
  }

  try {
    switch (action.actionType) {
      case "create_task": {
        // Supprime la tâche créée
        if (action.targetEntityId) {
          await execute(
            "DELETE FROM task_attachments WHERE task_id = ?",
            [action.targetEntityId],
          );
          await execute(
            "DELETE FROM tasks WHERE id = ? AND mission_id = ?",
            [action.targetEntityId, missionId],
          );
        }
        break;
      }
      case "update_task": {
        // Restaure before_state (JSON partiel des colonnes modifiées)
        if (action.targetEntityId && action.beforeState) {
          const before = JSON.parse(action.beforeState) as Record<string, unknown>;
          const sets: string[] = [];
          const args: unknown[] = [];
          for (const [k, v] of Object.entries(before)) {
            sets.push(`${k} = ?`);
            args.push(v);
          }
          if (sets.length > 0) {
            args.push(action.targetEntityId, missionId);
            await execute(
              `UPDATE tasks SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
              args as import("@libsql/client").InValue[],
            );
          }
        }
        break;
      }
      case "update_deliverable": {
        if (action.targetEntityId && action.beforeState) {
          const before = JSON.parse(action.beforeState) as Record<string, unknown>;
          const sets: string[] = [];
          const args: unknown[] = [];
          for (const [k, v] of Object.entries(before)) {
            sets.push(`${k} = ?`);
            args.push(v);
          }
          if (sets.length > 0) {
            args.push(action.targetEntityId, missionId);
            await execute(
              `UPDATE livrables SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
              args as import("@libsql/client").InValue[],
            );
          }
        }
        break;
      }
      case "add_context": {
        // Restaure missions.context d'avant
        if (action.beforeState) {
          await execute(
            `UPDATE missions SET context = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [action.beforeState, missionId],
          );
        }
        break;
      }
      case "recalibrate_plan": {
        // Dispatch vers revertRecalibration (chantier 4)
        if (action.targetEntityId) {
          const { revertRecalibration } = await import("./recalibration");
          await revertRecalibration(missionId, action.targetEntityId, revertedBy);
        }
        break;
      }
    }

    await execute(
      `UPDATE agent_actions SET reverted_at = datetime('now'), reverted_by = ?
       WHERE id = ? AND mission_id = ?`,
      [revertedBy, id, missionId],
    );
    return { ok: true, kind: action.actionType };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Revert échoué",
    };
  }
}
