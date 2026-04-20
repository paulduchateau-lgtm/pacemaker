"use client";

import { useEffect, useState } from "react";
import type { PlaudSignal, PlaudTranscript } from "@/types";
import SignalBadge from "./SignalBadge";

interface Props {
  transcript: PlaudTranscript;
  slug: string;
}

export default function TranscriptCard({ transcript, slug }: Props) {
  const [signals, setSignals] = useState<PlaudSignal[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function loadSignals() {
    const res = await fetch(`/api/plaud/${transcript.id}`, {
      headers: { "x-mission-slug": slug },
    });
    if (!res.ok) return;
    const json = await res.json();
    setSignals(json.signals ?? []);
  }

  useEffect(() => {
    loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript.id]);

  const date = transcript.recordedAt.slice(0, 10);
  const time = transcript.recordedAt.slice(11, 16);
  const duration = transcript.durationSeconds
    ? `${Math.round(transcript.durationSeconds / 60)} min`
    : null;

  return (
    <article
      className="p-4 space-y-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-medium" style={{ color: "var(--color-ink)", fontSize: "15px" }}>
          {transcript.contextLabel || "Transcript sans libellé"}
        </h3>
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          {date} {time} · {transcript.author}
          {duration ? ` · ${duration}` : ""}
        </span>
      </header>

      {transcript.summary && (
        <p style={{ color: "var(--color-ink)", fontSize: "14px", lineHeight: 1.5 }}>
          {transcript.summary}
        </p>
      )}

      {signals === null ? (
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          CHARGEMENT SIGNAUX…
        </p>
      ) : signals.length === 0 ? (
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          AUCUN SIGNAL EXTRAIT
        </p>
      ) : (
        <ul className="space-y-2">
          {signals.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start gap-2">
              <SignalBadge kind={s.kind} intensity={s.intensity} />
              <div className="flex-1 min-w-0" style={{ fontSize: "13px" }}>
                <span style={{ color: "var(--color-ink)" }}>
                  {s.subject ? <b>{s.subject}</b> : null}
                  {s.subject ? " — " : ""}
                  {s.content}
                </span>
                {s.rawExcerpt && (
                  <div
                    style={{
                      color: "var(--color-muted)",
                      fontStyle: "italic",
                      marginTop: 2,
                    }}
                  >
                    « {s.rawExcerpt} »
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mono-label"
        style={{
          color: "var(--color-muted)",
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
        }}
      >
        {expanded ? "▴ MASQUER TRANSCRIPT" : "▾ VOIR TRANSCRIPT COMPLET"}
      </button>
      {expanded && (
        <pre
          style={{
            backgroundColor: "var(--color-paper)",
            padding: "12px",
            borderRadius: "4px",
            fontSize: "12px",
            whiteSpace: "pre-wrap",
            maxHeight: "400px",
            overflow: "auto",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {transcript.rawContent}
        </pre>
      )}
    </article>
  );
}
