import { NextResponse } from "next/server";
import { seed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
