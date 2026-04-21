"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PulseData } from "@/lib/pulse";
import StakeholderCard from "@/components/pulse/StakeholderCard";
import PivotTimeline from "@/components/pulse/PivotTimeline";
import EventStream from "@/components/pulse/EventStream";

export default function PulsePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [data, setData] = useState<PulseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch("/api/pulse", {
        headers: { "x-mission-slug": slug },
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Pulse
        </h1>
        <p
          className="mono-label mt-1"
          style={{ color: "var(--color-muted)", maxWidth: "640px" }}
        >
          La dynamique humaine et les bascules du projet. Satisfaction des acteurs
          captée via les signaux Plaud. Bascules = recalibrations full_plan,
          incohérences majeures, signaux émotionnels intenses.
        </p>
      </div>

      {error && (
        <div
          className="p-3"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-alert, #D95B2F)",
            borderRadius: "6px",
            color: "var(--color-alert, #D95B2F)",
            fontSize: "13px",
          }}
        >
          Erreur chargement pulse : {error}
        </div>
      )}

      {!data && !error && (
        <p style={{ color: "var(--color-muted)" }}>Chargement...</p>
      )}

      {data && (
        <>
          <section className="space-y-3">
            <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
              STAKEHOLDERS ({data.stakeholders.length}) · SATISFACTION 7J GLISSANTS
            </h2>
            {data.stakeholders.length === 0 ? (
              <div
                className="p-4 text-center"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  color: "var(--color-muted)",
                }}
              >
                Aucun stakeholder identifié pour l&apos;instant.
                <br />
                <span style={{ fontSize: "12px" }}>
                  Les signaux Plaud avec un champ <code>subject</code> alimentent cette vue.
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                {data.stakeholders.map((s) => (
                  <StakeholderCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
              BASCULES PROJET ({data.pivots.length})
            </h2>
            <PivotTimeline pivots={data.pivots} />
          </section>

          <section className="space-y-3">
            <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
              FLUX ÉVÉNEMENTS ({data.events.length})
            </h2>
            <div
              className="p-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
              }}
            >
              <EventStream events={data.events} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
