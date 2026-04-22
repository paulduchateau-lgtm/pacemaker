import { query, execute } from "@/lib/db";
import type {
  Milestone,
  CreateMilestoneInput, UpdateMilestoneInput,
} from "@/types";
import type { InValue } from "@libsql/client";
import { newPlanId } from "@/lib/plan-phases";

type Row = Record<string, unknown>;

function rowToMilestone(r: Row): Milestone {
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    phaseId: String(r.phase_id),
    label: String(r.label),
    targetDate: (r.target_date as string | null) ?? null,
    actualDate: (r.actual_date as string | null) ?? null,
    status: String(r.status) as Milestone["status"],
    description: (r.description as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

export async function listMilestonesForMission(
  missionId: string,
  phaseId?: string,
): Promise<Milestone[]> {
  if (phaseId) {
    const rows = await query(
      "SELECT * FROM milestones WHERE mission_id = ? AND phase_id = ? ORDER BY target_date",
      [missionId, phaseId],
    );
    return rows.map(rowToMilestone);
  }
  const rows = await query(
    "SELECT * FROM milestones WHERE mission_id = ? ORDER BY target_date",
    [missionId],
  );
  return rows.map(rowToMilestone);
}

export async function getMilestoneById(id: string, missionId: string): Promise<Milestone | null> {
  const rows = await query(
    "SELECT * FROM milestones WHERE id = ? AND mission_id = ? LIMIT 1",
    [id, missionId],
  );
  return rows[0] ? rowToMilestone(rows[0]) : null;
}

export async function createMilestone(
  missionId: string,
  input: CreateMilestoneInput,
): Promise<Milestone> {
  const id = newPlanId("ms");
  await execute(
    `INSERT INTO milestones (id, mission_id, phase_id, label, target_date, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, missionId, input.phaseId, input.label, input.targetDate ?? null, input.description ?? null],
  );
  return (await getMilestoneById(id, missionId))!;
}

export async function updateMilestone(
  id: string,
  missionId: string,
  patch: UpdateMilestoneInput,
): Promise<Milestone | null> {
  const fieldMap: Record<string, string> = {
    label: "label",
    targetDate: "target_date",
    actualDate: "actual_date",
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
  if (!sets.length) return getMilestoneById(id, missionId);
  args.push(id, missionId);
  await execute(
    `UPDATE milestones SET ${sets.join(", ")} WHERE id = ? AND mission_id = ?`,
    args as InValue[],
  );
  return getMilestoneById(id, missionId);
}

export async function deleteMilestone(id: string, missionId: string): Promise<void> {
  await execute("DELETE FROM milestones WHERE id = ? AND mission_id = ?", [id, missionId]);
}
