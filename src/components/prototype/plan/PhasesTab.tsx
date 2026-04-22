"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { getWeekTasks, getTaskStats } from "@/lib/computed";
import Badge from "@/components/prototype/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import PhaseWeekSection from "./PhaseWeekSection";
import type { PanelContent } from "@/hooks/useSidePanel";

interface PhaseRow {
  id: string; label: string; order_index: number; color: string | null;
  planned_start: string | null; planned_end: string | null; status: string;
}
interface MilestoneRow {
  id: string; phase_id: string; label: string; target_date: string | null; status: string;
}

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
  const { weeks, tasks, currentWeek, fetchMissionState, fetchTasks, fetchLivrables } = useStore();
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    const h = { "x-mission-slug": slug };
    Promise.all([
      fetch("/api/data/phases", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/data/milestones", { headers: h }).then(r => r.json()).catch(() => []),
      fetchMissionState(),
      fetchTasks(),
      fetchLivrables(),
    ]).then(([pj, mj]) => {
      const pList: PhaseRow[] = (pj.phases ?? pj ?? []).sort((a: PhaseRow, b: PhaseRow) => a.order_index - b.order_index);
      setPhases(pList);
      setMilestones(mj.milestones ?? mj ?? []);
      const initOpen: Record<string, boolean> = {};
      pList.forEach((p: PhaseRow) => { initOpen[p.id] = p.status === "active" || p.status === "in_progress"; });
      setOpen(initOpen);
      setLoading(false);
    });
  }, [slug, fetchMissionState, fetchTasks, fetchLivrables]);

  const handleGenerate = async (weekId: number) => {
    setGenerating(weekId);
    try {
      const res = await fetch("/api/llm/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      if (res.ok) await fetchTasks();
    } catch { /* noop */ }
    setGenerating(null);
  };

  if (loading) return <p style={{ color: "var(--color-muted)" }}>Chargement...</p>;
  if (!phases.length) return (
    <div className="card" style={{ padding: 24, color: "var(--color-muted)", textAlign: "center" }}>
      Aucune phase définie pour cette mission.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {phases.map(phase => {
        const isOpen = open[phase.id] ?? false;
        const phaseWeeks = weeks.filter(w => w.phaseId === phase.id);
        const phaseMilestones = milestones.filter(m => m.phase_id === phase.id);
        const weekIds = new Set(phaseWeeks.map(w => w.id));
        const phaseTasks = tasks.filter(t => weekIds.has(Number(t.weekId)));
        const phaseStats = getTaskStats(phaseTasks);
        const color = phase.color ?? "var(--color-border)";

        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div
              className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-3 cursor-pointer min-h-[44px]"
              style={{ background: "var(--color-paper)", border: `1px solid ${color}`, borderRadius: "6px", borderLeftWidth: "4px" }}
              onClick={() => setOpen(s => ({ ...s, [phase.id]: !s[phase.id] }))}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: color }} />
              <span className="text-sm font-medium flex-1 min-w-0" style={{ color: "var(--color-ink)" }}>
                {phase.order_index}. {phase.label}
              </span>
              <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                {shortDate(phase.planned_start)} — {shortDate(phase.planned_end)}
              </span>
              <div className="w-16 md:w-24">
                <ProgressBar pct={phaseStats.pct} color={color} />
              </div>
              <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                {phaseStats.done}/{phaseStats.total}
              </span>
              <Badge tone={STATUS_TONE[phase.status] ?? ""}>{phase.status}</Badge>
              {onOpenPanel && (
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }}
                  onClick={e => { e.stopPropagation(); onOpenPanel({ type: "phase", id: phase.id }); }}>
                  Détail
                </button>
              )}
              <span style={{ color: "var(--color-muted)" }}>{isOpen ? "^" : "v"}</span>
            </div>

            {/* Phase body — weeks in calendar format */}
            {isOpen && (
              <div style={{ paddingLeft: 12, paddingTop: 8 }}>
                {phaseWeeks.map(w => (
                  <PhaseWeekSection
                    key={w.id}
                    week={w}
                    tasks={getWeekTasks(tasks, w.id)}
                    phaseColor={color}
                    isCurrent={w.id === currentWeek}
                    onGenerate={handleGenerate}
                    generating={generating === w.id}
                  />
                ))}

                {/* Jalons */}
                {phaseMilestones.length > 0 && (
                  <div style={{ marginTop: 4, marginBottom: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
                    <div className="mono-label" style={{ color: "var(--color-muted)", marginBottom: 6 }}>JALONS</div>
                    {phaseMilestones.map(m => (
                      <div key={m.id} className="flex items-center gap-2 py-1.5"
                        style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-ink)", flexShrink: 0 }} />
                        <span className="text-sm flex-1">{m.label}</span>
                        <span className="mono-label" style={{ color: "var(--color-muted)" }}>{shortDate(m.target_date)}</span>
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
