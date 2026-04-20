"use client";

import { useState } from "react";

interface Props {
  slug: string;
  onIngested: () => void;
}

export default function PlaudIngestForm({ slug, onIngested }: Props) {
  const [content, setContent] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (content.trim().length < 30) {
      setError("Le transcript doit faire au moins 30 caractères.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ingest/plaud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mission-slug": slug,
        },
        body: JSON.stringify({
          content,
          contextLabel: contextLabel.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur ingestion");
      setContent("");
      setContextLabel("");
      onIngested();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="p-4 space-y-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <label className="mono-label block" style={{ color: "var(--color-muted)" }}>
        CONTEXTE (optionnel — ex: Réunion steering DAS)
      </label>
      <input
        type="text"
        value={contextLabel}
        onChange={(e) => setContextLabel(e.target.value)}
        placeholder="Atelier AST, Point hebdo client…"
        disabled={busy}
        className="w-full px-3 py-2"
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          fontSize: "14px",
          minHeight: "44px",
        }}
      />
      <label className="mono-label block" style={{ color: "var(--color-muted)" }}>
        TRANSCRIPT PLAUD
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Colle ici le transcript exporté depuis Plaud…"
        disabled={busy}
        rows={10}
        className="w-full px-3 py-2"
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          fontSize: "14px",
          fontFamily: "var(--font-mono, monospace)",
        }}
      />
      {error && (
        <p style={{ color: "var(--color-alert, #D95B2F)", fontSize: "13px" }}>
          {error}
        </p>
      )}
      <button
        onClick={submit}
        disabled={busy || content.trim().length < 30}
        className="w-full sm:w-auto px-4 py-2 font-medium"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
          borderRadius: "4px",
          fontSize: "14px",
          minHeight: "44px",
          opacity: busy || content.trim().length < 30 ? 0.5 : 1,
          cursor: busy || content.trim().length < 30 ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "▶ Ingestion & extraction (20-30s)…" : "▶ Ingérer transcript"}
      </button>
    </div>
  );
}
