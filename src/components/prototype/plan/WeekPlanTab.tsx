"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";
import Confidence from "@/components/prototype/Confidence";
import PhaseRoadmap, { type RoadmapWeek } from "@/components/prototype/PhaseRoadmap";
import GenerateTasksButton from "@/components/prototype/GenerateTasksButton";
import TaskCheckbox from "@/components/prototype/TaskCheckbox";

interface TaskRow {
  id: string;
  week_id: number;
  label: string;
  owner: string;
  priority: string;
  status: string;
  source: string;
  jh_estime: number | null;
  confidence: number | null;
}

interface WeekRow {
  id: number;
  phase: string;
  title: string;
  budget_jh: number;
  start_date: string | null;
  end_date: string | null;
}

interface Props {
  slug: string;
}

const SRC_LABELS: Record<string, string> = {
  llm: "IA",
  manual: "manuel",
  upload: "upload",
  recalib: "recalib",
  vision: "photo",
};

export default function WeekPlanTab({ slug }: Props) {
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const [wRes, tRes, cwRes] = await Promise.all([
        fetch(`/api/data/weeks`, { headers: { "x-mission-slug": slug } }),
        fetch(`/api/data/tasks`, { headers: { "x-mission-slug": slug } }),
        fetch(`/api/data/current-week`, { headers: { "x-mission-slug": slug } }).catch(() => null),
      ]);
      const wJson = await wRes.json().catch(() => []);
      const tJson = await tRes.json().catch(() => []);
      setWeeks(Array.isArray(wJson) ? wJson : wJson.weeks ?? []);
      setTasks(Array.isArray(tJson) ? tJson : tJson.tasks ?? []);
      if (cwRes?.ok) {
        const cw = await cwRes.json().catch(() => null);
        if (cw?.currentWeek) setCurrentWeek(Number(cw.currentWeek));
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  const tasksByWeek = new Map<number, TaskRow[]>();
  for (const t of tasks) {
    const arr = tasksByWeek.get(t.week_id) ?? [];
    arr.push(t);
    tasksByWeek.set(t.week_id, arr);
  }

  const roadmapWeeks: RoadmapWeek[] = weeks.map((w) => {
    const id = Number(w.id);
    const wt = tasksByWeek.get(id) ?? [];
    const jhUsed = wt.filter((t) => t.status === "fait").reduce((a, t) => a + Number(t.jh_estime ?? 0), 0);
    const status: "fait" | "en cours" | "a venir" =
      id < currentWeek ? "fait" : id === currentWeek ? "en cours" : "a venir";
    return { id, phase: String(w.phase), title: String(w.title), budget: Number(w.budget_jh ?? 0), jhUsed, status: status as "fait" | "en cours" | "à venir", startIso: w.start_date, endIso: w.end_date };
  });

  return (
    <div>
      <PhaseRoadmap weeks={roadmapWeeks} currentWeek={currentWeek} />
      {roadmapWeeks.map((w) => {
        const wt = tasksByWeek.get(w.id) ?? [];
        const done = wt.filter((t) => t.status === "fait").length;
        const tonePhase: "" | "green" | "ink" = w.status === "fait" ? "green" : w.status === "en cours" ? "ink" : "";
        return (
          <section key={w.id} className="card" style={{ marginTop: 14 }}>
            <div className="card-head">
              <span className="phase-dot" style={{ background: "var(--ink)" }} />
              <span className="card-title">S{w.id} · {w.title}</span>
              <Badge tone={tonePhase} style={{ marginLeft: 8 }}>{w.status}</Badge>
              <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>
                {wt.length} taches · {done} ok · {w.budget} jh
              </span>
              <GenerateTasksButton weekId={w.id} slug={slug} label={wt.length === 0 ? "Generer" : "Completer par IA"} />
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {wt.length === 0 && (
                <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
                  Aucune tache — cliquer sur Generer ci-dessus.
                </div>
              )}
              {wt.map((t, i) => (
                <div key={t.id} className="row" style={{ padding: "9px 16px", borderBottom: i === wt.length - 1 ? "none" : "1px solid var(--border-soft)", gap: 12 }}>
                  <TaskCheckbox taskId={t.id} slug={slug} initialStatus={t.status} />
                  <span style={{ flex: 1, fontSize: 13, textDecoration: t.status === "fait" ? "line-through" : "none", color: t.status === "fait" ? "var(--muted)" : "var(--ink)" }}>
                    {t.label}
                  </span>
                  <Badge>{SRC_LABELS[t.source] ?? t.source}</Badge>
                  <Confidence value={t.confidence} />
                  <span className="mono" style={{ color: "var(--muted)", minWidth: 50 }}>{t.jh_estime ? `${t.jh_estime} jh` : "—"}</span>
                  <span className="mono" style={{ color: "var(--muted)", minWidth: 54 }}>{t.owner}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
