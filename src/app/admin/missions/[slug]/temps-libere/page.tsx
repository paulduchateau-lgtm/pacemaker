"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { TimeSavingsAggregate } from "@/lib/time-savings";

type Period = "week" | "month" | "mission";

const PERIOD_LABELS: Record<Period, string> = {
  week: "7 JOURS",
  month: "30 JOURS",
  mission: "MISSION",
};

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} h` : `${hours} h ${mins}`;
}

export default function TempsLiberePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [period, setPeriod] = useState<Period>("mission");
  const [data, setData] = useState<TimeSavingsAggregate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/time-savings?period=${period}`, {
      headers: { "x-mission-slug": slug },
    })
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, [slug, period]);

  const maxMinutes =
    data && data.byActivity.length > 0
      ? Math.max(...data.byActivity.map((a) => a.minutes))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Temps libéré
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          Estimation des minutes-consultant économisées par activité
          automatisée. Médianes validées ; à recalibrer avec l&apos;usage réel.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(["week", "month", "mission"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="mono-label px-3 py-1.5"
            style={{
              color: period === p ? "var(--color-ink)" : "var(--color-muted)",
              backgroundColor:
                period === p ? "var(--color-green)" : "transparent",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: "var(--color-muted)" }}>Chargement...</p>
      )}

      {data && (
        <>
          <div
            className="p-6 text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
            }}
          >
            <div
              className="mono-label mb-2"
              style={{ color: "var(--color-muted)" }}
            >
              TEMPS CUMULÉ ÉCONOMISÉ
            </div>
            <div
              className="text-4xl font-medium"
              style={{ color: "var(--color-green)" }}
            >
              {formatHours(data.totalMinutes)}
            </div>
            <div
              className="mono-label mt-2"
              style={{ color: "var(--color-muted)" }}
            >
              {data.byActivity.reduce((s, a) => s + a.count, 0)} événement(s)
              sur {PERIOD_LABELS[period]}
            </div>
          </div>

          {data.byActivity.length === 0 ? (
            <div
              className="p-6 text-center"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                color: "var(--color-muted)",
              }}
            >
              Aucun événement enregistré sur cette période. Génère une tâche,
              parse un CR ou consulte un briefing pour voir des chiffres ici.
            </div>
          ) : (
            <div
              className="p-4 space-y-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
              }}
            >
              <div
                className="mono-label"
                style={{ color: "var(--color-muted)" }}
              >
                DÉCOMPOSITION PAR ACTIVITÉ
              </div>
              {data.byActivity.map((a) => {
                const pct = maxMinutes > 0 ? (a.minutes / maxMinutes) * 100 : 0;
                return (
                  <div key={a.activity}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: "var(--color-ink)" }}>
                        {a.label}
                      </span>
                      <span
                        className="mono-label"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {a.count} × · {formatHours(a.minutes)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        backgroundColor: "var(--color-border)",
                        borderRadius: "3px",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          backgroundColor: "var(--color-green)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
