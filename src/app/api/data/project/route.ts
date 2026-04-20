import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";
import { setCurrentWeek } from "@/lib/current-week";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Répond à la fois les keys globales et la key `current_week` scopée à la
  // mission active — présentée au client sous son nom legacy `current_week`
  // pour ne pas casser le store Zustand qui la lit tel quel.
  const mission = await resolveActiveMission(req).catch(() => null);
  const rows = await query("SELECT key, value FROM project");
  const obj: Record<string, string> = {};
  for (const r of rows) {
    obj[r.key as string] = r.value as string;
  }
  if (mission) {
    const scoped = obj[`current_week:${mission.id}`];
    if (scoped) obj.current_week = scoped;
  }
  return NextResponse.json(obj);
}

export async function PATCH(req: NextRequest) {
  const { key, value } = await req.json();
  // current_week doit être scopé par mission (bug multi-mission : la dernière
  // mission visitée écrasait la semaine courante des autres).
  if (key === "current_week") {
    const mission = await resolveActiveMission(req);
    const n = parseInt(String(value), 10);
    await setCurrentWeek(mission.id, Number.isFinite(n) && n > 0 ? n : 1);
    return NextResponse.json({ ok: true });
  }
  await execute(
    "INSERT OR REPLACE INTO project (key, value) VALUES (?, ?)",
    [key, value]
  );
  return NextResponse.json({ ok: true });
}
