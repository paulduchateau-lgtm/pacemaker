import { NextRequest, NextResponse } from "next/server";
import { modifyImpact } from "@/lib/impacts";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.diff_after === undefined) {
    return NextResponse.json({ error: "diff_after requis" }, { status: 400 });
  }
  const userId = (body as Record<string, unknown>).user_id as string ?? "paul";
  const updated = await modifyImpact(params.id, body.diff_after, userId);
  return NextResponse.json({ impact: updated });
}
