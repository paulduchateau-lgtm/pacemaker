import { execute, query } from "./db";
import type { PlaudSignal, PlaudTranscript } from "@/types";

type Row = Record<string, unknown>;

function rowToTranscript(r: Row): PlaudTranscript {
  return {
    id: String(r.id),
    missionId: String(r.mission_id),
    documentId: (r.document_id as string | null) ?? null,
    author: String(r.author),
    recordedAt: String(r.recorded_at),
    contextLabel: (r.context_label as string | null) ?? null,
    durationSeconds: (r.duration_seconds as number | null) ?? null,
    rawContent: String(r.raw_content ?? ""),
    summary: (r.summary as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

function rowToSignal(r: Row): PlaudSignal {
  return {
    id: String(r.id),
    transcriptId: String(r.transcript_id),
    missionId: String(r.mission_id),
    kind: String(r.kind) as PlaudSignal["kind"],
    content: String(r.content),
    intensity: String(r.intensity) as PlaudSignal["intensity"],
    subject: (r.subject as string | null) ?? null,
    rawExcerpt: (r.raw_excerpt as string | null) ?? null,
    createdAt: String(r.created_at),
  };
}

const TRANSCRIPT_COLS =
  "id, mission_id, document_id, author, recorded_at, context_label, duration_seconds, raw_content, summary, created_at";
const SIGNAL_COLS =
  "id, transcript_id, mission_id, kind, content, intensity, subject, raw_excerpt, created_at";

export interface InsertTranscriptInput {
  missionId: string;
  documentId?: string | null;
  author?: string;
  recordedAt?: string;
  contextLabel?: string | null;
  durationSeconds?: number | null;
  rawContent: string;
  summary?: string | null;
}

export async function insertTranscript(
  input: InsertTranscriptInput,
): Promise<PlaudTranscript> {
  const id = `plaud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await execute(
    `INSERT INTO plaud_transcripts
       (id, mission_id, document_id, author, recorded_at, context_label,
        duration_seconds, raw_content, summary)
     VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), ?, ?, ?, ?)`,
    [
      id,
      input.missionId,
      input.documentId ?? null,
      input.author ?? "paul",
      input.recordedAt ?? null,
      input.contextLabel ?? null,
      input.durationSeconds ?? null,
      input.rawContent,
      input.summary ?? null,
    ],
  );
  const rows = await query(
    `SELECT ${TRANSCRIPT_COLS} FROM plaud_transcripts WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!rows[0]) throw new Error("Insert plaud_transcripts échoué");
  return rowToTranscript(rows[0]);
}

export async function updateTranscriptSummary(
  transcriptId: string,
  summary: string,
): Promise<void> {
  await execute(
    `UPDATE plaud_transcripts SET summary = ? WHERE id = ?`,
    [summary, transcriptId],
  );
}

export async function insertSignals(
  transcriptId: string,
  missionId: string,
  signals: Array<{
    kind: PlaudSignal["kind"];
    content: string;
    intensity: PlaudSignal["intensity"];
    subject?: string | null;
    rawExcerpt?: string | null;
  }>,
): Promise<number> {
  let count = 0;
  for (const s of signals) {
    if (!s?.kind || !s?.content) continue;
    const id = `psig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${count}`;
    await execute(
      `INSERT INTO plaud_signals
         (id, transcript_id, mission_id, kind, content, intensity, subject, raw_excerpt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transcriptId,
        missionId,
        s.kind,
        s.content,
        s.intensity ?? "moderate",
        s.subject ?? null,
        s.rawExcerpt ?? null,
      ],
    );
    count++;
  }
  return count;
}

export async function listTranscripts(
  missionId: string,
  limit = 50,
): Promise<PlaudTranscript[]> {
  const rows = await query(
    `SELECT ${TRANSCRIPT_COLS} FROM plaud_transcripts
     WHERE mission_id = ? ORDER BY recorded_at DESC, created_at DESC LIMIT ?`,
    [missionId, limit],
  );
  return rows.map(rowToTranscript);
}

export async function getTranscript(
  missionId: string,
  id: string,
): Promise<PlaudTranscript | null> {
  const rows = await query(
    `SELECT ${TRANSCRIPT_COLS} FROM plaud_transcripts
     WHERE id = ? AND mission_id = ? LIMIT 1`,
    [id, missionId],
  );
  return rows[0] ? rowToTranscript(rows[0]) : null;
}

export async function listSignalsForTranscript(
  transcriptId: string,
): Promise<PlaudSignal[]> {
  const rows = await query(
    `SELECT ${SIGNAL_COLS} FROM plaud_signals WHERE transcript_id = ?
     ORDER BY
       CASE kind
         WHEN 'decision' THEN 1 WHEN 'action' THEN 2 WHEN 'risk' THEN 3
         WHEN 'opportunity' THEN 4 WHEN 'frustration' THEN 5
         WHEN 'tension' THEN 6 WHEN 'uncertainty' THEN 7
         WHEN 'posture_shift' THEN 8 WHEN 'satisfaction' THEN 9 ELSE 10
       END, created_at DESC`,
    [transcriptId],
  );
  return rows.map(rowToSignal);
}

/** Signaux récents pour le bloc CHANGEMENTS RÉCENTS de la recalib. */
export async function listRecentSignals(
  missionId: string,
  sinceIso: string,
  limit = 25,
): Promise<PlaudSignal[]> {
  const rows = await query(
    `SELECT ${SIGNAL_COLS} FROM plaud_signals
     WHERE mission_id = ? AND created_at > ?
     ORDER BY
       CASE intensity WHEN 'strong' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
       created_at DESC
     LIMIT ?`,
    [missionId, sinceIso, limit],
  );
  return rows.map(rowToSignal);
}
