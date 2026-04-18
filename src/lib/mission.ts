import type { NextRequest } from "next/server";
import { query, execute } from "./db";
import {
  ACTIVE_MISSION_COOKIE,
  DEFAULT_MISSION_SLUG,
} from "./mission-constants";
import type {
  CreateMissionInput,
  Mission,
  MissionStatus,
  UpdateMissionInput,
} from "@/types";

// Ré-exports pour que les callers continuent à importer depuis `@/lib/mission`
// sans devoir connaître `mission-constants` (split uniquement Edge-compatible).
export { ACTIVE_MISSION_COOKIE, DEFAULT_MISSION_SLUG };

const SLUG_REGEX = /^[a-z0-9-]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function newId(): string {
  return "mission-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function validateSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug) || slug.length < 3 || slug.length > 60) {
    throw new Error(
      `Slug invalide : "${slug}". Attendu [a-z0-9-]{3,60}.`,
    );
  }
}

function validateIsoDate(label: string, date: string): void {
  if (!ISO_DATE_REGEX.test(date)) {
    throw new Error(`${label} doit être au format YYYY-MM-DD (reçu "${date}")`);
  }
}

type Row = Record<string, unknown>;

function rowToMission(row: Row): Mission {
  return {
    id: String(row.id),
    slug: String(row.slug),
    label: String(row.label),
    client: (row.client as string | null) ?? null,
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    status: String(row.status) as MissionStatus,
    theme: String(row.theme),
    context: (row.context as string | null) ?? null,
    ownerUserId: String(row.owner_user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const SELECT_COLS =
  "id, slug, label, client, start_date, end_date, status, theme, context, owner_user_id, created_at, updated_at";

export async function listMissions(opts: {
  statuses?: MissionStatus[];
  ownerUserId?: string;
} = {}): Promise<Mission[]> {
  const statuses = opts.statuses ?? ["active", "paused"];
  const placeholders = statuses.map(() => "?").join(",");
  const args: string[] = [...statuses];
  let sql = `SELECT ${SELECT_COLS} FROM missions WHERE status IN (${placeholders})`;
  if (opts.ownerUserId) {
    sql += " AND owner_user_id = ?";
    args.push(opts.ownerUserId);
  }
  sql += " ORDER BY start_date DESC, created_at DESC";
  const rows = await query(sql, args);
  return rows.map(rowToMission);
}

export async function getMissionById(id: string): Promise<Mission | null> {
  const rows = await query(
    `SELECT ${SELECT_COLS} FROM missions WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToMission(rows[0]) : null;
}

export async function getMissionBySlug(slug: string): Promise<Mission | null> {
  const rows = await query(
    `SELECT ${SELECT_COLS} FROM missions WHERE slug = ? LIMIT 1`,
    [slug],
  );
  return rows[0] ? rowToMission(rows[0]) : null;
}

export async function requireMissionBySlug(slug: string): Promise<Mission> {
  const m = await getMissionBySlug(slug);
  if (!m) throw new Error(`Mission introuvable pour le slug "${slug}"`);
  return m;
}

export async function getDefaultMission(): Promise<Mission> {
  return requireMissionBySlug(DEFAULT_MISSION_SLUG);
}

export async function createMission(input: CreateMissionInput): Promise<Mission> {
  validateSlug(input.slug);
  validateIsoDate("startDate", input.startDate);
  validateIsoDate("endDate", input.endDate);
  if (input.endDate < input.startDate) {
    throw new Error("endDate doit être >= startDate");
  }
  if (!input.label.trim()) throw new Error("label obligatoire");

  const existing = await getMissionBySlug(input.slug);
  if (existing) throw new Error(`Slug "${input.slug}" déjà utilisé`);

  const id = newId();
  await execute(
    `INSERT INTO missions (id, slug, label, client, start_date, end_date, theme, context, owner_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.label.trim(),
      input.client ?? null,
      input.startDate,
      input.endDate,
      input.theme ?? "liteops",
      input.context ?? null,
      input.ownerUserId ?? "paul",
    ],
  );
  const created = await getMissionById(id);
  if (!created) throw new Error("Création mission échouée");
  return created;
}

export async function updateMission(
  id: string,
  patch: UpdateMissionInput,
): Promise<Mission> {
  const current = await getMissionById(id);
  if (!current) throw new Error(`Mission introuvable : ${id}`);

  const sets: string[] = [];
  const args: (string | null)[] = [];
  const map: Record<keyof UpdateMissionInput, string> = {
    label: "label",
    client: "client",
    startDate: "start_date",
    endDate: "end_date",
    status: "status",
    theme: "theme",
    context: "context",
  };
  for (const [k, v] of Object.entries(patch) as [keyof UpdateMissionInput, unknown][]) {
    if (v === undefined) continue;
    if (k === "startDate" || k === "endDate") validateIsoDate(k, v as string);
    sets.push(`${map[k]} = ?`);
    args.push(v as string | null);
  }
  if (!sets.length) return current;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await execute(`UPDATE missions SET ${sets.join(", ")} WHERE id = ?`, args);
  const updated = await getMissionById(id);
  if (!updated) throw new Error("Mission introuvable après update");
  return updated;
}

export async function archiveMission(id: string): Promise<Mission> {
  return updateMission(id, { status: "archived" });
}

/**
 * Résout la mission active à partir d'une requête HTTP. Ordre de priorité :
 * 1. Query param `mission` (slug)
 * 2. Header `x-mission-slug`
 * 3. Cookie `active_mission_slug`
 * 4. Fallback DEFAULT_MISSION_SLUG (retiré au chantier 1.bis de nettoyage)
 *
 * Lève si aucun fallback ne résout (mission supprimée manuellement, etc.).
 */
export async function resolveActiveMission(req: NextRequest): Promise<Mission> {
  const url = new URL(req.url);
  const querySlug = url.searchParams.get("mission");
  const headerSlug = req.headers.get("x-mission-slug");
  const cookieSlug = req.cookies.get(ACTIVE_MISSION_COOKIE)?.value;
  const slug = (querySlug || headerSlug || cookieSlug || DEFAULT_MISSION_SLUG).trim();
  return requireMissionBySlug(slug);
}
