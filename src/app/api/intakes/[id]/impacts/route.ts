import { NextRequest, NextResponse } from "next/server";
import { listImpactsForIntake } from "@/lib/impacts";

export const dynamic = "force-dynamic";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const impacts = await listImpactsForIntake(params.id);
  return NextResponse.json(impacts);
}
