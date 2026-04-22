import { query, execute } from "@/lib/db";
import type { IntakeItem, CreateIntakeInput, IntakeStatus, CreateImpactInput, PlanImpact } from "@/types";
import type { InValue } from "@libsql/client";

type Row = Record<string, unknown>;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function rowToIntake(r: Row): IntakeItem {
  return {
    id: String(r.id),
    mission_id: String(r.mission_id),
    source_type: r.source_type as IntakeItem["source_type"],
    source_ref: (r.source_ref as string | null) ?? null,
    raw_content_ref: (r.raw_content_ref as string | null) ?? null,
    raw_content_excerpt: (r.raw_content_excerpt as string | null) ?? null,
    parsed_content: (r.parsed_content as string | null) ?? null,
    parse_generation_id: (r.parse_generation_id as string | null) ?? null,
    status: r.status as IntakeItem["status"],
    ingested_at: String(r.ingested_at),
    parsed_at: (r.parsed_at as string | null) ?? null,
    reviewed_at: (r.reviewed_at as string | null) ?? null,
    document_id: (r.document_id as string | null) ?? null,
    created_by: String(r.created_by),
  };
}

export async function createIntake(
  missionId: string,
  input: CreateIntakeInput,
): Promise<IntakeItem> {
  const id = newId("intake");
  await execute(
    `INSERT INTO intake_items
       (id, mission_id, source_type, raw_content_excerpt, source_ref, document_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, missionId, input.source_type,
     input.raw_content_excerpt ?? null,
     input.source_ref ?? null,
     input.document_id ?? null],
  );
  return (await getIntakeById(id))!;
}

export async function getIntakeById(id: string): Promise<IntakeItem | null> {
  const rows = await query("SELECT * FROM intake_items WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? rowToIntake(rows[0] as Row) : null;
}

export async function listIntakesForMission(
  missionId: string,
  status?: IntakeStatus,
): Promise<IntakeItem[]> {
  if (status) {
    const rows = await query(
      "SELECT * FROM intake_items WHERE mission_id = ? AND status = ? ORDER BY ingested_at DESC",
      [missionId, status],
    );
    return rows.map((r) => rowToIntake(r as Row));
  }
  const rows = await query(
    "SELECT * FROM intake_items WHERE mission_id = ? ORDER BY ingested_at DESC",
    [missionId],
  );
  return rows.map((r) => rowToIntake(r as Row));
}

export async function updateIntakeStatus(
  id: string,
  status: IntakeStatus,
  extra?: { parsed_at?: string; reviewed_at?: string; parse_generation_id?: string },
): Promise<void> {
  const sets = ["status = ?"];
  const args: InValue[] = [status];
  if (extra?.parsed_at) { sets.push("parsed_at = ?"); args.push(extra.parsed_at); }
  if (extra?.reviewed_at) { sets.push("reviewed_at = ?"); args.push(extra.reviewed_at); }
  if (extra?.parse_generation_id) { sets.push("parse_generation_id = ?"); args.push(extra.parse_generation_id); }
  args.push(id);
  await execute(`UPDATE intake_items SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function archiveIntake(id: string): Promise<void> {
  await execute(
    "UPDATE intake_items SET status = 'archived' WHERE id = ?",
    [id],
  );
}

/** Crée plusieurs plan_impacts pour un intake issu d'un parse texte. */
export async function parseIntakeFromText(
  missionId: string,
  intakeId: string,
  items: CreateImpactInput[],
): Promise<PlanImpact[]> {
  const { createImpact } = await import("@/lib/impacts");
  const results: PlanImpact[] = [];
  for (const item of items) {
    const impact = await createImpact(missionId, { ...item, intake_id: intakeId });
    results.push(impact);
  }
  return results;
}
