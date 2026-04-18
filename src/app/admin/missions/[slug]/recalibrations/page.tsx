"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Recalibration } from "@/lib/recalibration";

const TRIGGER_LABELS: Record<Recalibration["trigger"], string> = {
  manual: "Manuel",
  auto_on_incoherence: "Auto (incohérence)",
  auto_on_input: "Auto (input)",
  scheduled: "Planifié",
};

const SCOPE_LABELS: Record<Recalibration["scope"], string> = {
  full_plan: "Plan complet",
  downstream_only: "Aval uniquement",
  single_week: "Semaine unique",
};

export default function RecalibrationsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [items, setItems] = useState<Recalibration[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/recalibrations", {
      headers: { "x-mission-slug": slug },
    });
    const j = await res.json();
    setItems(j.recalibrations ?? []);
  }

  async function revert(id: string) {
    if (busy) return;
    if (
      !confirm(
        "Annuler cette recalibration ? Les tâches supprimées seront restaurées, les nouvelles supprimées.",
      )
    )
      return;
    setBusy(id);
    try {
      await fetch(`/api/recalibrations/${id}/revert`, {
        method: "POST",
        headers: { "x-mission-slug": slug },
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-lg font-medium"
          style={{ color: "var(--color-ink)" }}
        >
          Recalibrages
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          Historique des ré-plans. Chaque entrée peut être annulée (snapshot
          restauré).
        </p>
      </div>

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
          Aucun recalibrage enregistré.
        </div>
      )}

      <div className="space-y-3">
        {(items ?? []).map((r) => (
          <div
            key={r.id}
            className="p-4"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              opacity: r.revertedAt ? 0.5 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className="mono-label"
                  style={{ color: "var(--color-muted)" }}
                >
                  {r.createdAt.slice(0, 16)} · S{r.currentWeek ?? "?"} ·{" "}
                  {TRIGGER_LABELS[r.trigger]} · {SCOPE_LABELS[r.scope]}
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "var(--color-ink)" }}
                >
                  {r.changesSummary || "(sans note)"}
                </div>
                <div
                  className="mono-label mt-2"
                  style={{ color: "var(--color-muted)" }}
                >
                  +{r.tasksAdded} tâches · −{r.tasksRemoved} tâches
                </div>
              </div>
              {r.revertedAt ? (
                <span
                  className="mono-label"
                  style={{ color: "var(--color-muted)" }}
                >
                  REVERTÉ
                </span>
              ) : (
                <button
                  onClick={() => revert(r.id)}
                  disabled={busy === r.id}
                  className="mono-label px-3 py-1.5"
                  style={{
                    color: "var(--color-alert)",
                    border: "1px solid var(--color-alert)",
                    borderRadius: "6px",
                    opacity: busy === r.id ? 0.5 : 1,
                  }}
                >
                  {busy === r.id ? "..." : "ANNULER"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
