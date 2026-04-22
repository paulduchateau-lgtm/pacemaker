"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";
import type { PanelContent } from "@/hooks/useSidePanel";

interface PhaseRow {
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
  phase_id: string;
  label: string;
  target_date: string | null;
  status: string;
}

interface Props {
  slug: string;
  onOpenPanel?: (content: PanelContent) => void;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const STATUS_TONE: Record<string, "" | "green" | "amber" | "alert" | "soft"> = {
  active: "green",
  completed: "soft",
  pending: "",
  on_hold: "amber",
};

export default function PhasesTab({ slug, onOpenPanel }: Props) {
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/data/phases", { headers: { "x-mission-slug": slug } }),
        fetch("/api/data/milestones", { headers: { "x-mission-slug": slug } }),
      ]);
      const pj = await pRes.json().catch(() => []);
      const mj = await mRes.json().catch(() => []);
      const pList: PhaseRow[] = (pj.phases ?? pj ?? []).sort(
        (a: PhaseRow, b: PhaseRow) => a.order_index - b.order_index,
      );
      setPhases(pList);
      setMilestones(mj.milestones ?? mj ?? []);
      const initOpen: Record<string, boolean> = {};
      pList.forEach((p) => { initOpen[p.id] = p.status === "active"; });
      setOpen(initOpen);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  if (phases.length === 0) {
    return (
      <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
        Aucune phase definie pour cette mission.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {phases.map((phase) => {
        const isOpen = open[phase.id] ?? false;
        const phaseMilestones = milestones.filter((m) => m.phase_id === phase.id);
        const tone = STATUS_TONE[phase.status] ?? "";
        return (
          <div key={phase.id} className="card">
            <div
              className="card-head"
              style={{ cursor: "pointer" }}
              onClick={() => setOpen((s) => ({ ...s, [phase.id]: !s[phase.id] }))}
            >
              <span
                style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: phase.color ?? "var(--border)",
                }}
              />
              <span className="card-title" style={{ flex: 1 }}>
                {phase.order_index}. {phase.label}
              </span>
              <Badge tone={tone}>{phase.status}</Badge>
              <span className="mono" style={{ color: "var(--muted)", marginLeft: 8 }}>
                {shortDate(phase.planned_start)} — {shortDate(phase.planned_end)}
              </span>
              {onOpenPanel && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: "2px 8px", marginLeft: 8 }}
                  onClick={(e) => { e.stopPropagation(); onOpenPanel({ type: "phase", id: phase.id }); }}
                >
                  Detail
                </button>
              )}
              <span style={{ marginLeft: 8, color: "var(--muted)" }}>{isOpen ? "^" : "v"}</span>
            </div>
            {isOpen && (
              <div className="card-body" style={{ padding: "8px 16px" }}>
                {phaseMilestones.length === 0 && (
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Aucun jalon pour cette phase.</div>
                )}
                {phaseMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="row"
                    style={{ gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border-soft)" }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{m.label}</span>
                    <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
                      {shortDate(m.target_date)}
                    </span>
                    <Badge tone={STATUS_TONE[m.status] ?? ""}>{m.status}</Badge>
                    {onOpenPanel && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: "2px 6px" }}
                        onClick={() => onOpenPanel({ type: "milestone", id: m.id })}
                      >
                        Detail
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
