import { query, execute } from "@/lib/db";
import type { PlanImpact, CreateImpactInput, PlanImpactStatus } from "@/types";
import type { InValue } from "@libsql/client";

type Row = Record<string, unknown>;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function rowToImpact(r: Row): PlanImpact {
  return {
    id: String(r.id),
    mission_id: String(r.mission_id),
    intake_id: (r.intake_id as string | null) ?? null,
    generation_id: (r.generation_id as string | null) ?? null,
    target_type: r.target_type as PlanImpact["target_type"],
    target_id: (r.target_id as string | null) ?? null,
    change_type: r.change_type as PlanImpact["change_type"],
    diff_before: (r.diff_before as string | null) ?? null,
    diff_after: (r.diff_after as string | null) ?? null,
    rationale: (r.rationale as string | null) ?? null,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    severity: r.severity as PlanImpact["severity"],
    status: r.status as PlanImpact["status"],
    order_index: Number(r.order_index ?? 0),
    decided_at: (r.decided_at as string | null) ?? null,
    decided_by: (r.decided_by as string | null) ?? null,
    agent_action_id: (r.agent_action_id as string | null) ?? null,
    superseded_by: (r.superseded_by as string | null) ?? null,
    created_at: String(r.created_at),
  };
}

export async function createImpact(
  missionId: string,
  input: CreateImpactInput,
): Promise<PlanImpact> {
  const id = newId("impact");
  await execute(
    `INSERT INTO plan_impacts
       (id, mission_id, intake_id, generation_id, target_type, target_id,
        change_type, diff_before, diff_after, rationale, confidence,
        severity, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, missionId,
      input.intake_id ?? null,
      input.generation_id ?? null,
      input.target_type,
      input.target_id ?? null,
      input.change_type,
      input.diff_before != null ? JSON.stringify(input.diff_before) : null,
      input.diff_after != null ? JSON.stringify(input.diff_after) : null,
      input.rationale ?? null,
      input.confidence ?? null,
      input.severity ?? "moderate",
      input.order_index ?? 0,
    ],
  );
  return (await getImpactById(id))!;
}

export async function getImpactById(id: string): Promise<PlanImpact | null> {
  const rows = await query("SELECT * FROM plan_impacts WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? rowToImpact(rows[0] as Row) : null;
}

export async function listImpactsForIntake(intakeId: string): Promise<PlanImpact[]> {
  const rows = await query(
    "SELECT * FROM plan_impacts WHERE intake_id = ? ORDER BY order_index",
    [intakeId],
  );
  return rows.map((r) => rowToImpact(r as Row));
}

export async function listPendingImpactsForMission(
  missionId: string,
  statuses: PlanImpactStatus[] = ["proposed", "modified"],
): Promise<PlanImpact[]> {
  const placeholders = statuses.map(() => "?").join(",");
  const rows = await query(
    `SELECT * FROM plan_impacts WHERE mission_id = ? AND status IN (${placeholders}) ORDER BY created_at`,
    [missionId, ...statuses] as InValue[],
  );
  return rows.map((r) => rowToImpact(r as Row));
}

export async function countPendingImpacts(missionId: string): Promise<number> {
  const rows = await query(
    "SELECT COUNT(*) as c FROM plan_impacts WHERE mission_id = ? AND status IN ('proposed','modified')",
    [missionId],
  );
  return Number((rows[0] as Row)?.c ?? 0);
}

export async function rejectImpact(
  impactId: string,
  userId: string,
  rationale?: string,
): Promise<void> {
  const sets = ["status = 'rejected'", "decided_at = datetime('now')", "decided_by = ?"];
  const args: InValue[] = [userId];
  if (rationale) { sets.push("rationale = ?"); args.push(rationale); }
  args.push(impactId);
  await execute(`UPDATE plan_impacts SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function modifyImpact(
  impactId: string,
  newDiffAfter: unknown,
  userId: string,
): Promise<PlanImpact> {
  const old = await getImpactById(impactId);
  if (!old) throw new Error(`Impact introuvable: ${impactId}`);
  const newId2 = newId("impact");
  await execute(
    `INSERT INTO plan_impacts
       (id, mission_id, intake_id, generation_id, target_type, target_id,
        change_type, diff_before, diff_after, rationale, confidence, severity, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId2, old.mission_id, old.intake_id ?? null, old.generation_id ?? null,
      old.target_type, old.target_id ?? null, old.change_type,
      old.diff_after ?? null,
      JSON.stringify(newDiffAfter),
      old.rationale ?? null, old.confidence ?? null, old.severity, old.order_index,
    ],
  );
  await execute(
    "UPDATE plan_impacts SET status = 'superseded', superseded_by = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ?",
    [newId2, userId, impactId],
  );
  return (await getImpactById(newId2))!;
}
