"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { PlaudTranscript } from "@/types";
import Icon from "@/components/prototype/Icon";

export default function PlaudPanel({ slug }: { slug: string }) {
  const [items, setItems] = useState<PlaudTranscript[] | null>(null);
  const [content, setContent] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/plaud", { headers: { "x-mission-slug": slug } });
    const json = await res.json();
    setItems(json.transcripts ?? []);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    setError(null);
    if (content.trim().length < 30) { setError("Transcript trop court (30 caractères min)."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ingest/plaud", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({ content, contextLabel: contextLabel.trim() || null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur ingestion");
      setContent("");
      setContextLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
        Colle un transcript Plaud — l&apos;IA extrait décisions, actions, risques et signaux
        émotionnels (satisfaction, frustration, tension…) qui alimentent la recalibration.
      </p>

      <input
        type="text"
        value={contextLabel}
        onChange={(e) => setContextLabel(e.target.value)}
        placeholder="Contexte (optionnel — ex : Atelier AST, Point hebdo client)"
        disabled={busy}
        style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid var(--border)", borderRadius: 6,
          fontSize: 13.5, background: "var(--paper-elevated)",
        }}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Colle ici le transcript exporté depuis Plaud…"
        disabled={busy}
        rows={8}
        style={{
          width: "100%", padding: 12,
          border: "1px solid var(--border)", borderRadius: 6,
          fontSize: 13, fontFamily: "var(--mono)",
          background: "var(--paper-elevated)", resize: "vertical",
        }}
      />
      {error && <p className="mono" style={{ color: "var(--alert)" }}>{error}</p>}
      <button
        onClick={submit}
        disabled={busy || content.trim().length < 30}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start", opacity: busy || content.trim().length < 30 ? 0.5 : 1 }}
      >
        {busy ? "⧳ Ingestion & extraction (20-30s)…" : "▶ Ingérer transcript"}
      </button>

      {items && items.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 8 }}>
            HISTORIQUE RÉCENT · {items.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.slice(0, 5).map((t) => (
              <div key={t.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: "var(--ink)", color: "var(--paper)",
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}
                  >
                    <Icon name="mic" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {t.contextLabel ?? "Transcript Plaud"}
                    </div>
                    <div className="mono" style={{ color: "var(--muted)" }}>
                      {new Date(t.recordedAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                      {t.durationSeconds ? ` · ${Math.round(t.durationSeconds / 60)} min` : ""}
                      {` · ${t.author}`}
                    </div>
                    {t.summary && (
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                        {t.summary.slice(0, 180)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href={`/admin/missions/${slug}/plaud`} className="mono" style={{ color: "var(--muted)", marginTop: 10, display: "inline-block" }}>
            Voir tout l&apos;historique →
          </Link>
        </div>
      )}
    </div>
  );
}
