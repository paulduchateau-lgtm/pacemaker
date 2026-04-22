"use client";

import { useEffect, useState } from "react";
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

export default function RecalibrationsList({ slug }: { slug: string }) {
  const [items, setItems] = useState<Recalibration[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/recalibrations", { headers: { "x-mission-slug": slug } });
    const j = await res.json();
    setItems(j.recalibrations ?? []);
  }

  async function revert(id: string) {
    if (busy) return;
    if (!confirm("Annuler cette recalibration ? Les tâches supprimées seront restaurées, les nouvelles supprimées.")) return;
    setBusy(id);
    try {
      await fetch(`/api/recalibrations/${id}/revert`, { method: "POST", headers: { "x-mission-slug": slug } });
      await load();
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (items === null) return <p className="mono" style={{ color: "var(--muted)" }}>Chargement…</p>;
  if (items.length === 0)
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
        Aucun recalibrage enregistré.
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((r) => (
        <div key={r.id} className="card" style={{ padding: 14, opacity: r.revertedAt ? 0.5 : 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="mono" style={{ color: "var(--muted)" }}>
                {r.createdAt.slice(0, 16)} · S{r.currentWeek ?? "?"} · {TRIGGER_LABELS[r.trigger]} · {SCOPE_LABELS[r.scope]}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 3 }}>
                {r.changesSummary || "(sans note)"}
              </div>
              <div className="mono" style={{ color: "var(--muted)", marginTop: 6 }}>
                +{r.tasksAdded} tâches · −{r.tasksRemoved} tâches
              </div>
            </div>
            {r.revertedAt ? (
              <span className="mono" style={{ color: "var(--muted)" }}>REVERTÉ</span>
            ) : (
              <button
                onClick={() => revert(r.id)}
                disabled={busy === r.id}
                className="mono"
                style={{
                  color: "var(--alert)",
                  border: "1px solid var(--alert)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  opacity: busy === r.id ? 0.5 : 1,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {busy === r.id ? "…" : "ANNULER"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
