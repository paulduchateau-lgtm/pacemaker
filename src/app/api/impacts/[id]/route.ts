import { NextRequest, NextResponse } from "next/server";
import { getImpactById, modifyImpact } from "@/lib/impacts";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const impact = await getImpactById(params.id);
  if (!impact) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(impact);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.diff_after === undefined) {
    return NextResponse.json({ error: "diff_after requis" }, { status: 400 });
  }
  const updated = await modifyImpact(params.id, body.diff_after, body.user_id ?? "paul");
  return NextResponse.json({ impact: updated });
}
