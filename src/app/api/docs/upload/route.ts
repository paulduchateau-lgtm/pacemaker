import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { indexDocument } from "@/lib/rag";
import { extractText } from "@/lib/doc-parser";
import { put } from "@vercel/blob";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

const EXT_TO_DOCTYPE: Record<string, string> = {
  pdf: "spec",
  docx: "note",
  pptx: "note",
  xlsx: "spec",
  xls: "spec",
  jpg: "photo",
  jpeg: "photo",
  png: "photo",
  webp: "photo",
  heic: "photo",
};

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "";
    const weekId = formData.get("weekId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Fichier requis" },
        { status: 400 }
      );
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 20 Mo)" },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TYPES.includes(file.type) &&
      !file.name.match(/\.(pdf|docx|pptx|xlsx|xls|jpg|jpeg|png|webp|heic)$/i)
    ) {
      return NextResponse.json(
        { error: "Format non supporté. Formats : PDF, DOCX, PPTX, XLSX, images" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const docType = EXT_TO_DOCTYPE[ext] || "autre";

    // Upload to Blob
    const blob = await put(`pacemaker/docs/${file.name}`, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    // Extract text
    let textContent = "";
    if (file.type.startsWith("image/")) {
      // For images, use Vision API to extract text
      try {
        const { extractFromImage } = await import("@/lib/vision");
        const extraction = await extractFromImage(blob.url);
        textContent = extraction.ocr_text || extraction.summary || "";
      } catch {
        textContent = `[Image: ${file.name}]`;
      }
    } else {
      textContent = await extractText(buffer, file.type, file.name);
    }

    // Save to DB
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const docTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");

    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, blob_url, content, mission_id)
       VALUES (?, ?, ?, 'upload', ?, ?, ?, ?)`,
      [
        id,
        docTitle,
        docType,
        weekId ? parseInt(weekId) : null,
        blob.url,
        textContent,
        mission.id,
      ],
    );

    // Index for RAG
    if (textContent.trim().length > 0) {
      try {
        await indexDocument(id, textContent);
      } catch {
        // RAG indexing is optional
      }
    }

    const rows = await query(
      "SELECT * FROM documents WHERE id = ? AND mission_id = ?",
      [id, mission.id],
    );
    const r = rows[0];

    // Refonte recalib : un nouveau doc (CR, spec, note) peut changer le plan.
    // Await synchrone (sur Vercel serverless, le fire-and-forget est tué).
    try {
      const { performRecalibration } = await import("@/lib/recalibration");
      let currentWeek = 1;
      try {
        const rows = await query(
          "SELECT value FROM project WHERE key = 'current_week'",
        );
        if (rows[0]?.value) {
          const n = parseInt(String(rows[0].value), 10);
          if (Number.isFinite(n) && n > 0) currentWeek = n;
        }
      } catch {
        /* fallback */
      }
      await performRecalibration({
        missionId: mission.id,
        currentWeek,
        scope: "downstream_only",
        trigger: "auto_on_input",
        triggerRef: id,
      });
    } catch (err) {
      console.warn("[docs/upload] recalib auto échouée:", err);
    }

    return NextResponse.json({
      id: r.id,
      title: r.title,
      type: r.type,
      source: r.source,
      weekId: r.week_id,
      blobUrl: r.blob_url,
      content: r.content,
      createdAt: r.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
