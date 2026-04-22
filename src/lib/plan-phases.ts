import { query, execute } from "@/lib/db";
import type { PlanPhase, CreatePhaseInput, UpdatePhaseInput } from "@/types";
import type { InValue } from "@libsql/client";

type Row = Record<string, unknown>;

export function newPlanId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function rowToPhase(r: Row): PlanPhase {
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    orderIndex: Number(r.order_index),
    label: String(r.label),
    color: String(r.color),
    startDate: (r.start_date as string | null) ?? null,
    endDate: (r.end_date as string | null) ?? null,
    actualStartDate: (r.actual_start_date as string | null) ?? null,
    actualEndDate: (r.actual_end_date as string | null) ?? null,
    status: String(r.status) as PlanPhase["status"],
    description: (r.description as string | null) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listPhasesForMission(missionId: string): Promise<PlanPhase[]> {
  const rows = await query(
    "SELECT * FROM phases WHERE mission_id = ? ORDER BY order_index",
    [missionId],
  );
  return rows.map(rowToPhase);
}

export async function getPhaseById(id: string, missionId: string): Promise<PlanPhase | null> {
  const rows = await query(
    "SELECT * FROM phases WHERE id = ? AND mission_id = ? LIMIT 1",
    [id, missionId],
  );
  return rows[0] ? rowToPhase(rows[0]) : null;
}

export async function createPhase(missionId: string, input: CreatePhaseInput): Promise<PlanPhase> {
  const id = newPlanId("phase");
  await execute(
    `INSERT INTO phases (id, mission_id, order_index, label, color, start_date, end_date, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, missionId, input.orderIndex, input.label, input.color ?? "#A5D900",
     input.startDate ?? null, input.endDate ?? null, input.description ?? null],
  );
  return (await getPhaseById(id, missionId))!;
}

export async function updatePhase(
  id: string,
  missionId: string,
  patch: UpdatePhaseInput,
): Promise<PlanPhase | null> {
  const fieldMap: Record<string, string> = {
    label: "label",
    color: "color",
    startDate: "start_date",
    endDate: "end_date",
    actualStartDate: "actual_start_date",
    actualEndDate: "actual_end_date",
    status: "status",
    description: "description",
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
  if (!sets.length) return getPhaseById(id, missionId);
  sets.push("updated_at = datetime('now')");
  args.push(id, missionId);
  await execute(
    `UPDATE phases SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
    args as InValue[],
  );
  return getPhaseById(id, missionId);
}

export async function archivePhase(id: string, missionId: string): Promise<void> {
  await execute(
    "UPDATE phases SET status = 'compromised', updated_at = datetime('now') WHERE id = ? AND mission_id = ?",
    [id, missionId],
  );
}
