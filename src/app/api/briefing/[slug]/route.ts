import { NextRequest, NextResponse } from "next/server";
import { generateBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const briefing = await generateBriefing({
      missionSlug: slug,
      forceRefresh,
    });
    return NextResponse.json({ briefing });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
