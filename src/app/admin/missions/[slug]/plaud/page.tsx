"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { PlaudTranscript } from "@/types";
import PlaudIngestForm from "@/components/plaud/PlaudIngestForm";
import TranscriptCard from "@/components/plaud/TranscriptCard";

export default function PlaudPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [items, setItems] = useState<PlaudTranscript[] | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/plaud", {
      headers: { "x-mission-slug": slug },
    });
    const json = await res.json();
    setItems(json.transcripts ?? []);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Transcripts Plaud
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          Chaque transcript est analysé pour en extraire décisions, actions,
          risques + signaux émotionnels (satisfaction, frustration, tension,
          incertitude, posture). Les signaux émotionnels alimentent la
          prochaine recalibration.
        </p>
      </div>

      <PlaudIngestForm slug={slug} onIngested={load} />

      {items === null && (
        <p style={{ color: "var(--color-muted)" }}>Chargement...</p>
      )}

      {items !== null && items.length === 0 && (
        <div
          className="p-6 text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-muted)",
          }}
        >
          Aucun transcript ingéré pour cette mission.
        </div>
      )}

      {items !== null && items.length > 0 && (
        <section className="space-y-3">
          <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
            HISTORIQUE ({items.length})
          </h2>
          {items.map((t) => (
            <TranscriptCard key={t.id} transcript={t} slug={slug} />
          ))}
        </section>
      )}
    </div>
  );
}
