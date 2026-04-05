import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await query("SELECT key, value FROM project");
  const obj: Record<string, string> = {};
  for (const r of rows) {
    obj[r.key as string] = r.value as string;
  }
  return NextResponse.json(obj);
}

export async function PATCH(req: NextRequest) {
  const { key, value } = await req.json();
  await execute(
    "INSERT OR REPLACE INTO project (key, value) VALUES (?, ?)",
    [key, value]
  );
  return NextResponse.json({ ok: true });
}
