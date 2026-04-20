import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";
import { callLLMCached, parseJSON } from "@/lib/llm";
import {
  buildPlaudExtractionPrompt,
  type PlaudExtractionResult,
} from "@/lib/prompts";
import { getMissionContext } from "@/lib/mission-context";
import { indexDocument } from "@/lib/rag";
import {
  insertTranscript,
  insertSignals,
  updateTranscriptSummary,
} from "@/lib/plaud";
import { trackGeneration } from "@/lib/corrections";

export const dynamic = "force-dynamic";
// Ingestion = 1 appel LLM (extraction signaux) + indexation RAG. 60s de marge.
export const maxDuration = 60;

interface IngestBody {
  content: string;
  author?: string;
  recordedAt?: string;
  contextLabel?: string | null;
  durationSeconds?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = (await req.json()) as IngestBody;

    if (!body?.content || typeof body.content !== "string" || body.content.trim().length < 30) {
      return NextResponse.json(
        { error: "content requis (min 30 caractères)" },
        { status: 400 },
      );
    }

    const recordedAt = body.recordedAt ?? new Date().toISOString();
    const author = body.author ?? "paul";
    const contextLabel = body.contextLabel ?? null;

    // 1) Document indexé (RAG) — le transcript devient cherchable comme tout
    //    autre doc de la mission. Titre dérivé du contexte ou de la date.
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const title = contextLabel
      ? `Plaud — ${contextLabel}`
      : `Plaud — ${recordedAt.slice(0, 10)} (${author})`;
    await execute(
      `INSERT INTO documents (id, title, type, source, content, mission_id)
       VALUES (?, ?, 'plaud', 'plaud', ?, ?)`,
      [docId, title, body.content, mission.id],
    );
    // Indexation en chunks/embeddings — best effort (Voyage peut échouer).
    let chunksIndexed = 0;
    try {
      chunksIndexed = await indexDocument(docId, body.content);
    } catch (err) {
      console.warn("[plaud ingest] indexDocument failed:", err);
    }

    // 2) Row plaud_transcripts (relie au document pour RAG)
    const transcript = await insertTranscript({
      missionId: mission.id,
      documentId: docId,
      author,
      recordedAt,
      contextLabel,
      durationSeconds: body.durationSeconds ?? null,
      rawContent: body.content,
    });

    // 3) Extraction LLM des signaux (cached system)
    const missionContext = await getMissionContext({ missionId: mission.id });
    const { system, user } = buildPlaudExtractionPrompt(
      body.content,
      { contextLabel, author, recordedAt },
      missionContext,
    );
    const { text: rawOutput, usage, model } = await callLLMCached(
      system,
      user,
      2000,
    );

    const generationId = await trackGeneration({
      generationType: "plaud",
      context: { transcriptId: transcript.id, contextLabel, author },
      prompt: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`,
      rawOutput,
      appliedRuleIds: [],
      weekId: undefined,
      missionId: mission.id,
      usage,
      model,
      route: "ingest/plaud",
      triggeredBy: "user",
    });

    let extracted: PlaudExtractionResult | null = null;
    try {
      extracted = parseJSON<PlaudExtractionResult>(rawOutput);
    } catch {
      console.warn("[plaud ingest] JSON invalide, signaux non extraits");
    }

    let signalsInserted = 0;
    if (extracted) {
      if (typeof extracted.summary === "string" && extracted.summary.trim()) {
        await updateTranscriptSummary(transcript.id, extracted.summary.trim());
      }
      if (Array.isArray(extracted.signals)) {
        signalsInserted = await insertSignals(
          transcript.id,
          mission.id,
          extracted.signals.map((s) => ({
            kind: s.kind,
            content: s.content,
            intensity: s.intensity,
            subject: s.subject ?? null,
            rawExcerpt: s.raw_excerpt ?? null,
          })),
        );
      }
    }

    // 4) Event journal mission (type plaud)
    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const evtLabel = contextLabel
      ? `Plaud ingéré — ${contextLabel}`
      : `Plaud ingéré (${recordedAt.slice(0, 10)})`;
    await execute(
      `INSERT INTO events (id, type, label, week_id, content, mission_id)
       VALUES (?, 'upload', ?, 0, ?, ?)`,
      [evtId, evtLabel, extracted?.summary ?? "", mission.id],
    );

    console.log(
      `[plaud] ingested transcript=${transcript.id} chunks=${chunksIndexed} signals=${signalsInserted} in=${usage.inputTokens}tk cacheRead=${usage.cacheReadTokens ?? 0}tk`,
    );

    return NextResponse.json({
      ok: true,
      transcriptId: transcript.id,
      documentId: docId,
      signalsInserted,
      chunksIndexed,
      generationId,
      summary: extracted?.summary ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
