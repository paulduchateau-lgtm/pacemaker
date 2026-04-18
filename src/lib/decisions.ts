import { execute, query } from "./db";
import type {
  CreateDecisionInput,
  Decision,
  DecisionAuthor,
  DecisionLink,
  DecisionLinkEntity,
  DecisionLinkType,
  DecisionSourceType,
  DecisionStatus,
  RationaleSource,
  UpdateDecisionInput,
} from "@/types";

function newDecisionId(): string {
  return "dec-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function newLinkId(): string {
  return "declink-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

type Row = Record<string, unknown>;

function rowToDecision(row: Row): Decision {
  const alt = row.alternatives as string | null;
  let alternatives: string[] | null = null;
  if (alt) {
    try {
      const parsed = JSON.parse(alt);
      if (Array.isArray(parsed)) alternatives = parsed;
    } catch {
      /* ignore */
    }
  }
  return {
    id: String(row.id),
    missionId: String(row.mission_id),
    statement: String(row.statement),
    rationale: (row.rationale as string | null) ?? null,
    rationaleSource: String(row.rationale_source) as RationaleSource,
    alternatives,
    author: String(row.author) as DecisionAuthor,
    confidence: (row.confidence as number | null) ?? null,
    status: String(row.status) as DecisionStatus,
    sourceType: String(row.source_type) as DecisionSourceType,
    sourceRef: (row.source_ref as string | null) ?? null,
    revisedFrom: (row.revised_from as string | null) ?? null,
    weekId: (row.week_id as number | null) ?? null,
    createdAt: String(row.created_at),
    actedAt: String(row.acted_at),
  };
}

function rowToLink(row: Row): DecisionLink {
  return {
    id: String(row.id),
    decisionId: String(row.decision_id),
    entityType: String(row.entity_type) as DecisionLinkEntity,
    entityId: String(row.entity_id),
    linkType: String(row.link_type) as DecisionLinkType,
    createdAt: String(row.created_at),
  };
}

const COLS =
  "id, mission_id, statement, rationale, rationale_source, alternatives, author, confidence, status, source_type, source_ref, revised_from, week_id, created_at, acted_at";

export async function listDecisions(
  missionId: string,
  opts: { statuses?: DecisionStatus[]; weekId?: number } = {},
): Promise<Decision[]> {
  const statuses = opts.statuses ?? ["proposée", "actée", "révisée"];
  const placeholders = statuses.map(() => "?").join(",");
  const args: (string | number)[] = [missionId, ...statuses];
  let sql = `SELECT ${COLS} FROM decisions WHERE mission_id = ? AND status IN (${placeholders})`;
  if (opts.weekId !== undefined) {
    sql += " AND week_id = ?";
    args.push(opts.weekId);
  }
  sql += " ORDER BY acted_at DESC, created_at DESC";
  const rows = await query(sql, args);
  return rows.map(rowToDecision);
}

export async function getDecisionById(
  missionId: string,
  id: string,
): Promise<Decision | null> {
  const rows = await query(
    `SELECT ${COLS} FROM decisions WHERE id = ? AND mission_id = ? LIMIT 1`,
    [id, missionId],
  );
  return rows[0] ? rowToDecision(rows[0]) : null;
}

export async function createDecision(
  missionId: string,
  input: CreateDecisionInput,
  opts: {
    triggeringMessageId?: string | null;
    narrative?: string;
  } = {},
): Promise<Decision> {
  if (!input.statement.trim()) throw new Error("statement obligatoire");
  const id = newDecisionId();
  const alternatives = input.alternatives?.length
    ? JSON.stringify(input.alternatives)
    : null;
  const rationaleSource: RationaleSource = input.rationale ? "native" : "native";
  await execute(
    `INSERT INTO decisions
       (id, mission_id, statement, rationale, rationale_source, alternatives,
        author, confidence, status, source_type, source_ref, week_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      missionId,
      input.statement.trim(),
      input.rationale ?? null,
      rationaleSource,
      alternatives,
      input.author ?? "paul",
      input.confidence ?? null,
      input.status ?? "actée",
      input.sourceType ?? "manual",
      input.sourceRef ?? null,
      input.weekId ?? null,
    ],
  );
  const created = await getDecisionById(missionId, id);
  if (!created) throw new Error("Création décision échouée");

  // Chantier 7 : trace dans le journal agent unifié (hybride).
  try {
    const { logAgentAction } = await import("./agent-actions");
    await logAgentAction({
      missionId,
      actionType: "create_decision",
      narrative:
        opts.narrative ??
        `Décision consignée : « ${input.statement.trim()} »`,
      reasoning: input.rationale ?? null,
      targetEntityType: "decision",
      targetEntityId: id,
      confidence: input.confidence ?? null,
      sourceMessageId: opts.triggeringMessageId ?? null,
    });
  } catch {
    /* journal est best-effort */
  }

  return created;
}

export async function updateDecision(
  missionId: string,
  id: string,
  patch: UpdateDecisionInput,
): Promise<Decision> {
  const current = await getDecisionById(missionId, id);
  if (!current) throw new Error("Décision introuvable");
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const map: Record<keyof UpdateDecisionInput, string> = {
    statement: "statement",
    rationale: "rationale",
    rationaleSource: "rationale_source",
    alternatives: "alternatives",
    status: "status",
    weekId: "week_id",
  };
  for (const [k, v] of Object.entries(patch) as [
    keyof UpdateDecisionInput,
    unknown,
  ][]) {
    if (v === undefined) continue;
    if (k === "alternatives") {
      sets.push(`${map[k]} = ?`);
      args.push(Array.isArray(v) ? JSON.stringify(v) : null);
    } else {
      sets.push(`${map[k]} = ?`);
      args.push(v as string | number | null);
    }
  }
  if (!sets.length) return current;
  args.push(id, missionId);
  await execute(
    `UPDATE decisions SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
    args,
  );
  const updated = await getDecisionById(missionId, id);
  if (!updated) throw new Error("Décision introuvable après update");
  return updated;
}

/**
 * Marque une décision comme révisée par une nouvelle décision (qui la supersede).
 * La décision source passe en `status='révisée'`, la nouvelle référence
 * l'ancienne via `revised_from`.
 */
export async function reviseDecision(
  missionId: string,
  sourceId: string,
  newInput: CreateDecisionInput,
): Promise<Decision> {
  const source = await getDecisionById(missionId, sourceId);
  if (!source) throw new Error("Décision source introuvable");
  const replacement = await createDecision(missionId, {
    ...newInput,
    sourceType: newInput.sourceType ?? "manual",
  });
  await execute(
    `UPDATE decisions SET revised_from = ? WHERE id = ? AND mission_id = ?`,
    [sourceId, replacement.id, missionId],
  );
  await updateDecision(missionId, sourceId, { status: "révisée" });
  const finalized = await getDecisionById(missionId, replacement.id);
  return finalized!;
}

export async function cancelDecision(
  missionId: string,
  id: string,
): Promise<Decision> {
  return updateDecision(missionId, id, { status: "annulée" });
}

export async function listLinksForDecision(
  decisionId: string,
): Promise<DecisionLink[]> {
  const rows = await query(
    `SELECT id, decision_id, entity_type, entity_id, link_type, created_at
     FROM decision_links WHERE decision_id = ?`,
    [decisionId],
  );
  return rows.map(rowToLink);
}

export async function listLinksForEntity(
  entityType: DecisionLinkEntity,
  entityId: string,
): Promise<DecisionLink[]> {
  const rows = await query(
    `SELECT id, decision_id, entity_type, entity_id, link_type, created_at
     FROM decision_links WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
  );
  return rows.map(rowToLink);
}

export async function linkDecision(
  decisionId: string,
  entityType: DecisionLinkEntity,
  entityId: string,
  linkType: DecisionLinkType = "impacts",
): Promise<DecisionLink> {
  const id = newLinkId();
  await execute(
    `INSERT INTO decision_links (id, decision_id, entity_type, entity_id, link_type)
     VALUES (?, ?, ?, ?, ?)`,
    [id, decisionId, entityType, entityId, linkType],
  );
  const rows = await query(
    `SELECT id, decision_id, entity_type, entity_id, link_type, created_at
     FROM decision_links WHERE id = ?`,
    [id],
  );
  return rowToLink(rows[0]);
}

export async function unlinkDecision(linkId: string): Promise<void> {
  await execute("DELETE FROM decision_links WHERE id = ?", [linkId]);
}
