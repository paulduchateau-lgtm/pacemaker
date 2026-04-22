"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";

interface PhaseData {
  id: string;
  label: string;
  order_index: number;
  color: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
}

interface MilestoneRow {
  id: string;
  label: string;
  target_date: string | null;
  status: string;
}

interface Props {
  id: string;
  slug: string;
}

const TONE: Record<string, "" | "green" | "amber" | "alert" | "soft"> = {
  active: "green",
  completed: "soft",
  pending: "",
  on_hold: "amber",
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PhasePanel({ id, slug }: Props) {
  const [phase, setPhase] = useState<PhaseData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !slug) return;
    (async () => {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/data/phases/${id}`, { headers: { "x-mission-slug": slug } }),
        fetch(`/api/data/milestones?phase_id=${id}`, { headers: { "x-mission-slug": slug } }),
      ]);
      const pj = await pRes.json().catch(() => ({}));
      const mj = await mRes.json().catch(() => []);
      setPhase(pj.phase ?? pj);
      setMilestones(mj.milestones ?? mj ?? []);
      setLoading(false);
    })();
  }, [id, slug]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (!phase) return <p style={{ color: "var(--muted)" }}>Phase introuvable.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.1em" }}>
          PHASE {phase.order_index}
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{phase.label}</div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Badge tone={TONE[phase.status] ?? ""}>{phase.status}</Badge>
        {phase.color && (
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>DEBUT PLANIFIE</div>
          <div style={{ fontSize: 13 }}>{shortDate(phase.planned_start)}</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>FIN PLANIFIEE</div>
          <div style={{ fontSize: 13 }}>{shortDate(phase.planned_end)}</div>
        </div>
        {phase.actual_start && (
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>DEBUT REEL</div>
            <div style={{ fontSize: 13 }}>{shortDate(phase.actual_start)}</div>
          </div>
        )}
        {phase.actual_end && (
          <div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>FIN REELLE</div>
            <div style={{ fontSize: 13 }}>{shortDate(phase.actual_end)}</div>
          </div>
        )}
      </div>

      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 8, letterSpacing: "0.1em" }}>
          JALONS ({milestones.length})
        </div>
        {milestones.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Aucun jalon pour cette phase.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {milestones.map((m) => (
              <div key={m.id} className="row" style={{ gap: 10, padding: "8px 12px", background: "var(--paper-sunk)", border: "1px solid var(--border-soft)", borderRadius: 4 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{m.label}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{shortDate(m.target_date)}</span>
                <Badge tone={TONE[m.status] ?? ""}>{m.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
