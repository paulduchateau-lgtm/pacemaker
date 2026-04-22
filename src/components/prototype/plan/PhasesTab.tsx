"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";
import PhaseWeekSection from "./PhaseWeekSection";
import type { PanelContent } from "@/hooks/useSidePanel";

interface PhaseRow { id: string; label: string; order_index: number; color: string | null;
  planned_start: string | null; planned_end: string | null; status: string }
interface MilestoneRow { id: string; phase_id: string; label: string; target_date: string | null; status: string }
interface WeekRow { id: number; title: string; phaseId: string | null }
interface TaskRow { id: string; weekId: number; label: string; owner: string; priority: string; status: string }
interface LivrableRow { id: string; weekId: number; label: string; status: string; primaryPhaseId: string | null }

interface Props { slug: string; onOpenPanel?: (content: PanelContent) => void }

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const STATUS_TONE: Record<string, "" | "green" | "amber" | "alert" | "soft"> = {
  active: "green", completed: "soft", pending: "", on_hold: "amber",
  not_started: "soft", in_progress: "green", compromised: "alert",
};

export default function PhasesTab({ slug, onOpenPanel }: Props) {
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [livrables, setLivrables] = useState<LivrableRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const h = { "x-mission-slug": slug };
    Promise.all([
      fetch("/api/data/phases", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/data/milestones", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/data/weeks", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/data/tasks", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/data/livrables", { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([pj, mj, wj, tj, lj]) => {
      const pList: PhaseRow[] = (pj.phases ?? pj ?? []).sort((a: PhaseRow, b: PhaseRow) => a.order_index - b.order_index);
      setPhases(pList);
      setMilestones(mj.milestones ?? mj ?? []);
      setWeeks(wj ?? []);
      setTasks(tj ?? []);
      setLivrables(lj ?? []);
      const initOpen: Record<string, boolean> = {};
      pList.forEach((p: PhaseRow) => { initOpen[p.id] = p.status === "active" || p.status === "in_progress"; });
      setOpen(initOpen);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (!phases.length) return (
    <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
      Aucune phase définie pour cette mission.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {phases.map(phase => {
        const isOpen = open[phase.id] ?? false;
        const phaseWeeks = weeks.filter(w => w.phaseId === phase.id);
        const phaseMilestones = milestones.filter(m => m.phase_id === phase.id);
        const weekIds = new Set(phaseWeeks.map(w => Number(w.id)));
        const phaseTasks = tasks.filter(t => weekIds.has(Number(t.weekId)));
        const phaseLivr = livrables.filter(l => l.primaryPhaseId === phase.id || weekIds.has(Number(l.weekId)));

        return (
          <div key={phase.id} className="card">
            <div className="card-head" style={{ cursor: "pointer" }}
              onClick={() => setOpen(s => ({ ...s, [phase.id]: !s[phase.id] }))}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: phase.color ?? "var(--border)" }} />
              <span className="card-title" style={{ flex: 1 }}>
                {phase.order_index}. {phase.label}
              </span>
              <span className="mono muted" style={{ fontSize: 10.5 }}>
                {phaseTasks.length}t · {phaseLivr.length}l
              </span>
              <Badge tone={STATUS_TONE[phase.status] ?? ""}>{phase.status}</Badge>
              <span className="mono" style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>
                {shortDate(phase.planned_start)} — {shortDate(phase.planned_end)}
              </span>
              {onOpenPanel && (
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", marginLeft: 8 }}
                  onClick={e => { e.stopPropagation(); onOpenPanel({ type: "phase", id: phase.id }); }}>
                  Détail
                </button>
              )}
              <span style={{ marginLeft: 8, color: "var(--muted)" }}>{isOpen ? "^" : "v"}</span>
            </div>

            {isOpen && (
              <div className="card-body" style={{ padding: "12px 16px" }}>
                {/* Semaines avec tâches et livrables */}
                {phaseWeeks.map(w => (
                  <PhaseWeekSection
                    key={w.id}
                    weekId={Number(w.id)}
                    weekTitle={w.title}
                    tasks={phaseTasks.filter(t => Number(t.weekId) === Number(w.id))}
                    livrables={phaseLivr.filter(l => Number(l.weekId) === Number(w.id))}
                  />
                ))}

                {/* Jalons */}
                {phaseMilestones.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
                    <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}>
                      JALONS
                    </div>
                    {phaseMilestones.map(m => (
                      <div key={m.id} className="row" style={{ gap: 10, padding: "6px 0",
                        borderBottom: "1px solid var(--border-soft)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%",
                          background: "var(--ink)", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13 }}>{m.label}</span>
                        <span className="mono muted" style={{ fontSize: 11 }}>{shortDate(m.target_date)}</span>
                        <Badge tone={STATUS_TONE[m.status] ?? ""}>{m.status}</Badge>
                        {onOpenPanel && (
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 6px" }}
                            onClick={() => onOpenPanel({ type: "milestone", id: m.id })}>
                            Détail
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
