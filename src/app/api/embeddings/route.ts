import { NextRequest, NextResponse } from "next/server";
import { getEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, inputType } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "text requis" }, { status: 400 });
    }

    const embedding = await getEmbedding(text, inputType || "query");
    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
