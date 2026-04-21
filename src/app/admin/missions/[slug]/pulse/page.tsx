"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PulseData } from "@/lib/pulse";
import StakeholderCard from "@/components/pulse/StakeholderCard";
import StakeholderMap from "@/components/pulse/StakeholderMap";
import PivotTimeline from "@/components/pulse/PivotTimeline";
import EventStream from "@/components/pulse/EventStream";
import MoodHero from "@/components/pulse/MoodHero";
import SignalMix from "@/components/pulse/SignalMix";
import InsightTile from "@/components/pulse/InsightTile";

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
      <header>
        <div
          className="mono-label"
          style={{
            color: "var(--color-muted)",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 7px",
              background: "var(--color-paper, #F0EEEB)",
              borderRadius: 3,
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-green, #A5D900)",
                display: "inline-block",
              }}
            />
            VUE INÉDITE
          </span>
          <span style={{ color: "var(--color-muted)" }}>·</span>
          <span>ESSENCE DU PROJET · LU PAR PACEMAKER</span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 500,
            color: "var(--color-ink)",
          }}
        >
          Pulse humain
        </h1>
        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 14,
            color: "var(--color-ink)",
            maxWidth: "680px",
          }}
        >
          Le projet vu par ses acteurs — interactions, satisfactions, bascules,
          signaux faibles. Satisfaction calculée depuis les signaux Plaud sur 7
          jours glissants. Bascules = recalibrations full_plan, incohérences
          majeures, signaux émotionnels intenses.
        </p>
      </header>

      {error && (
        <div
          className="p-3"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-alert, #D95B2F)",
            borderRadius: "6px",
            color: "var(--color-alert, #D95B2F)",
            fontSize: 13,
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
          {/* MoodHero — score global + signal bars 14j + bascules */}
          <MoodHero
            score={data.moodScore}
            delta={data.moodDelta}
            stakeholdersCount={data.stakeholders.length}
            series={data.moodSeries}
            pivots={data.pivots}
          />

          {/* Carte relationnelle + Signal mix */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
              gap: 12,
            }}
          >
            <section
              className="p-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span className="mono-label" style={{ color: "var(--color-ink)" }}>
                  CARTE RELATIONNELLE
                </span>
                <span
                  className="mono-label"
                  style={{ color: "var(--color-muted)", marginLeft: "auto" }}
                >
                  TAILLE = INTERACTIONS · COULEUR = SATISFACTION
                </span>
              </header>
              <StakeholderMap stakeholders={data.stakeholders} />
            </section>
            <SignalMix mix={data.signalMix} />
          </div>

          {/* Cards stakeholders */}
          <section className="space-y-3">
            <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
              STAKEHOLDERS ({data.stakeholders.length})
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
                <span style={{ fontSize: 12 }}>
                  Les signaux Plaud avec un champ <code>subject</code> alimentent
                  cette vue.
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

          {/* Insights auto-détectés */}
          {data.insights.length > 0 && (
            <section className="space-y-3">
              <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
                CE QUE PACEMAKER A REMARQUÉ ({data.insights.length})
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {data.insights.map((ins) => (
                  <InsightTile key={ins.id} insight={ins} />
                ))}
              </div>
            </section>
          )}

          {/* Bascules */}
          <section className="space-y-3">
            <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
              BASCULES PROJET ({data.pivots.length})
            </h2>
            <PivotTimeline pivots={data.pivots} />
          </section>

          {/* Flux complet */}
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
