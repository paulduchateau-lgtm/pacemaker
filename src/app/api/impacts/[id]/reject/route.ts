import { NextRequest, NextResponse } from "next/server";
import { rejectImpact } from "@/lib/impacts";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => ({}));
  const userId = (body as Record<string, unknown>).user_id as string ?? "paul";
  const rationale = (body as Record<string, unknown>).rationale as string | undefined;
  await rejectImpact(params.id, userId, rationale);
  return NextResponse.json({ ok: true });
}
