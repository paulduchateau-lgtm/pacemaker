import { NextRequest, NextResponse } from "next/server";
import { applyImpact } from "@/lib/impacts-apply";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = (body as Record<string, unknown>).user_id as string ?? "paul";
    const result = await applyImpact(params.id, userId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
