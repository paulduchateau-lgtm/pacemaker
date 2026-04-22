import { query, execute } from "@/lib/db";
import type { DeliverableIteration, CreateIterationInput, UpdateIterationInput } from "@/types";
import type { InValue } from "@libsql/client";
import { newPlanId } from "@/lib/plan-phases";

type Row = Record<string, unknown>;

function rowToIteration(r: Row): DeliverableIteration {
  return {
    id: String(r.id),
    deliverableId: String(r.deliverable_id),
    missionId: String(r.mission_id),
    phaseId: String(r.phase_id),
    orderIndex: Number(r.order_index),
    labelSuffix: (r.label_suffix as string | null) ?? null,
    targetMilestoneId: (r.target_milestone_id as string | null) ?? null,
    status: String(r.status) as DeliverableIteration["status"],
    targetDate: (r.target_date as string | null) ?? null,
    actualDeliveryDate: (r.actual_delivery_date as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listIterationsForDeliverable(
  deliverableId: string,
): Promise<DeliverableIteration[]> {
  const rows = await query(
    "SELECT * FROM deliverable_iterations WHERE deliverable_id = ? ORDER BY order_index",
    [deliverableId],
  );
  return rows.map(rowToIteration);
}

export async function listIterationsForPhase(
  phaseId: string,
  missionId: string,
): Promise<DeliverableIteration[]> {
  const rows = await query(
    "SELECT * FROM deliverable_iterations WHERE phase_id = ? AND mission_id = ? ORDER BY order_index",
    [phaseId, missionId],
  );
  return rows.map(rowToIteration);
}

export async function getIterationById(id: string): Promise<DeliverableIteration | null> {
  const rows = await query(
    "SELECT * FROM deliverable_iterations WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ? rowToIteration(rows[0]) : null;
}

export async function createIteration(
  missionId: string,
  input: CreateIterationInput,
): Promise<DeliverableIteration> {
  const id = newPlanId("iter");
  await execute(
    `INSERT INTO deliverable_iterations
     (id, deliverable_id, mission_id, phase_id, order_index, label_suffix,
      target_milestone_id, target_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.deliverableId,
      missionId,
      input.phaseId,
      input.orderIndex,
      input.labelSuffix ?? null,
      input.targetMilestoneId ?? null,
      input.targetDate ?? null,
      input.notes ?? null,
    ],
  );
  return (await getIterationById(id))!;
}

export async function updateIteration(
  id: string,
  patch: UpdateIterationInput,
): Promise<DeliverableIteration | null> {
  const fieldMap: Record<string, string> = {
    status: "status",
    targetDate: "target_date",
    actualDeliveryDate: "actual_delivery_date",
    labelSuffix: "label_suffix",
    targetMilestoneId: "target_milestone_id",
    notes: "notes",
  };
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const [k, col] of Object.entries(fieldMap)) {
    const val = (patch as Record<string, unknown>)[k];
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      args.push(val ?? null);
    }
  }
  if (!sets.length) return getIterationById(id);
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await execute(
    `UPDATE deliverable_iterations SET ${sets.join(", ")} WHERE id = ?`,
    args as InValue[],
  );
  return getIterationById(id);
}

export async function deleteIteration(id: string): Promise<void> {
  await execute("DELETE FROM deliverable_iterations WHERE id = ?", [id]);
}
