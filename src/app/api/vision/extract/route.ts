import { NextRequest, NextResponse } from "next/server";
import { extractFromImage } from "@/lib/vision";
import { uploadImage } from "@/lib/storage-blob";

export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type non supporté. Formats : jpg, png, webp, heic" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 MB)" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `capture-${Date.now()}.jpg`;
    const blobUrl = await uploadImage(buffer, filename);

    // Extract with Claude Vision
    const extraction = await extractFromImage(blobUrl);

    return NextResponse.json({ blobUrl, extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
