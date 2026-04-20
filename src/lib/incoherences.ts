import { execute, query } from "./db";

/**
 * Les incohérences sont désormais détectées PENDANT la recalibration (même
 * appel LLM, champ `detected_incoherences` dans la sortie JSON). Ce module
 * ne contient plus que les helpers de lecture et de résolution utilisés par
 * l'UI admin `/admin/missions/[slug]/incoherences` et le briefing.
 *
 * Le module antérieur contenait un détecteur indépendant (detectIncoherences
 * + kickOffDetection) qui n'était branché que sur parse-upload et ne
 * remontait jamais rien en prod. Voir commit de fusion chantier 2.
 */

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
