import { query, execute } from "@/lib/db";
import type { SuccessCriterion } from "@/types";
import { newPlanId } from "@/lib/plan-phases";

type Row = Record<string, unknown>;

function rowToCriterion(r: Row): SuccessCriterion {
  return {
    id: String(r.id),
    milestoneId: String(r.milestone_id),
    label: String(r.label),
    assessmentType: String(r.assessment_type) as SuccessCriterion["assessmentType"],
    targetValue: (r.target_value as string | null) ?? null,
    currentValue: (r.current_value as string | null) ?? null,
    status: String(r.status) as SuccessCriterion["status"],
    lastAssessedAt: (r.last_assessed_at as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    orderIndex: Number(r.order_index),
    createdAt: String(r.created_at),
  };
}

export async function listCriteriaForMilestone(milestoneId: string): Promise<SuccessCriterion[]> {
  const rows = await query(
    "SELECT * FROM success_criteria WHERE milestone_id = ? ORDER BY order_index",
    [milestoneId],
  );
  return rows.map(rowToCriterion);
}

export async function getCriterionById(id: string): Promise<SuccessCriterion | null> {
  const rows = await query("SELECT * FROM success_criteria WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? rowToCriterion(rows[0]) : null;
}

export async function createCriterion(
  milestoneId: string,
  label: string,
  orderIndex = 0,
): Promise<SuccessCriterion> {
  const id = newPlanId("sc");
  await execute(
    `INSERT INTO success_criteria (id, milestone_id, label, order_index) VALUES (?, ?, ?, ?)`,
    [id, milestoneId, label, orderIndex],
  );
  return (await getCriterionById(id))!;
}

export async function assessCriterion(
  id: string,
  patch: {
    status: SuccessCriterion["status"];
    currentValue?: string | null;
    notes?: string | null;
  },
): Promise<SuccessCriterion | null> {
  await execute(
    `UPDATE success_criteria SET status = ?, current_value = ?, notes = ?,
     last_assessed_at = datetime('now') WHERE id = ?`,
    [patch.status, patch.currentValue ?? null, patch.notes ?? null, id],
  );
  return getCriterionById(id);
}
