import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Orchestrateur : lance lot A DDL + seed phases + lot B DDL + sources-status.
 * Appel : POST /api/migrate/all-v2
 * (Les routes individuelles restent appelables séparément.)
 */
async function callLocal(req: NextRequest, path: string): Promise<{ status: number; body: unknown }> {
  const url = new URL(path, req.nextUrl.origin);
  const headers: Record<string, string> = {};
  const slug = req.headers.get("x-mission-slug");
  if (slug) headers["x-mission-slug"] = slug;
  const res = await fetch(url, { method: "POST", headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function POST(req: NextRequest) {
  const steps = ["/api/migrate/lot-a", "/api/migrate/lot-b", "/api/migrate/sources-status", "/api/migrate/lot-a-seed"];
  const results: Record<string, unknown> = {};
  for (const p of steps) {
    const r = await callLocal(req, p);
    results[p] = r.body;
    if (r.status >= 400) {
      return NextResponse.json({ ok: false, failed_at: p, results }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, results });
}
