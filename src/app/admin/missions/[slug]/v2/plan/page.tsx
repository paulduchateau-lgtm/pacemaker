import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import { getCurrentWeek } from "@/lib/current-week";
import Badge from "@/components/prototype/Badge";
import Confidence from "@/components/prototype/Confidence";
import PhaseRoadmap, { type RoadmapWeek } from "@/components/prototype/PhaseRoadmap";
import GenerateTasksButton from "@/components/prototype/GenerateTasksButton";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function safe<T = Row>(sql: string, args: unknown[]): Promise<T[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as T[];
  } catch {
    return [];
  }
}

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

export default async function PlanPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();
  const currentWeek = await getCurrentWeek(mission.id);

  const [weekRows, taskRows, livrableRows] = await Promise.all([
    safe<Row>(
      `SELECT id, phase, title, budget_jh, start_date, end_date, owner
       FROM weeks WHERE mission_id = ? ORDER BY id`,
      [mission.id],
    ),
    safe<TaskRow>(
      `SELECT id, week_id, label, owner, priority, status, source, jh_estime, confidence
       FROM tasks WHERE mission_id = ? ORDER BY week_id, priority`,
      [mission.id],
    ),
    safe<{ source_task_id: string | null }>(
      `SELECT source_task_id FROM livrables WHERE mission_id = ? AND source_task_id IS NOT NULL`,
      [mission.id],
    ).catch(() => [] as { source_task_id: string | null }[]),
  ]);
  const livrablesByTask = new Map<string, number>();
  for (const l of livrableRows) {
    if (l.source_task_id) livrablesByTask.set(l.source_task_id, (livrablesByTask.get(l.source_task_id) ?? 0) + 1);
  }

  const tasksByWeek = new Map<number, TaskRow[]>();
  for (const t of taskRows) {
    const arr = tasksByWeek.get(t.week_id) ?? [];
    arr.push(t);
    tasksByWeek.set(t.week_id, arr);
  }

  const roadmapWeeks: RoadmapWeek[] = weekRows.map((w) => {
    const id = Number(w.id);
    const tasks = tasksByWeek.get(id) ?? [];
    const jhUsed = tasks
      .filter((t) => t.status === "fait")
      .reduce((acc, t) => acc + Number(t.jh_estime ?? 0), 0);
    const status: "fait" | "en cours" | "à venir" =
      id < currentWeek
        ? "fait"
        : id === currentWeek
        ? "en cours"
        : "à venir";
    return {
      id,
      phase: String(w.phase),
      title: String(w.title),
      budget: Number(w.budget_jh ?? 0),
      jhUsed,
      status,
      startIso: (w.start_date as string | null) ?? null,
      endIso: (w.end_date as string | null) ?? null,
    };
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            PLAN · {roadmapWeeks.length} SEMAINES · S{currentWeek} EN COURS
          </div>
          <h1 className="page-title">Plan vivant</h1>
          <div className="page-sub">
            Vue Gantt simplifiée par phase, tâches par semaine. Les recalibrations
            et bascules apparaissent sur la page Pulse.
          </div>
        </div>
      </div>

      <PhaseRoadmap weeks={roadmapWeeks} currentWeek={currentWeek} />

      {roadmapWeeks.map((w) => {
        const tasks = tasksByWeek.get(w.id) ?? [];
        const done = tasks.filter((t) => t.status === "fait").length;
        const tonePhase: "" | "green" | "ink" = w.status === "fait" ? "green" : w.status === "en cours" ? "ink" : "";
        return (
          <section
            key={w.id}
            className="card"
            style={{ marginTop: 14 }}
          >
            <div className="card-head">
              <span
                className="phase-dot"
                style={{ background: "var(--ink)" }}
              />
              <span className="card-title">
                S{w.id} · {w.title}
              </span>
              <Badge tone={tonePhase} style={{ marginLeft: 8 }}>
                {w.status}
              </Badge>
              <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>
                {tasks.length} tâches · {done} ✓ · {w.budget} jh budget
              </span>
              <GenerateTasksButton
                weekId={w.id}
                slug={slug}
                label={tasks.length === 0 ? "Générer les tâches" : "Compléter par IA"}
              />
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {tasks.length === 0 && (
                <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
                  Aucune tâche pour cette semaine — clique sur « Générer les tâches » ci-dessus.
                </div>
              )}
              {tasks.map((t, i) => {
                const sc =
                  t.status === "à faire"
                    ? "var(--muted)"
                    : t.status === "en cours"
                    ? "var(--sky)"
                    : t.status === "bloqué"
                    ? "var(--alert)"
                    : "var(--green-deep)";
                const srcLabel =
                  t.source === "llm"
                    ? "IA"
                    : t.source === "manual"
                    ? "manuel"
                    : t.source === "upload"
                    ? "upload"
                    : t.source === "recalib"
                    ? "recalib"
                    : t.source === "vision"
                    ? "photo"
                    : t.source;
                return (
                  <div
                    key={t.id}
                    className="row"
                    style={{
                      padding: "9px 16px",
                      borderBottom: i === tasks.length - 1 ? "none" : "1px solid var(--border-soft)",
                      gap: 12,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        border: `1.5px solid ${sc}`,
                        flexShrink: 0,
                        background: t.status === "fait" ? sc : "transparent",
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 13 }}>{t.label}</span>
                    {livrablesByTask.has(t.id) && (
                      <a
                        href={`/admin/missions/${slug}/v2/livrables`}
                        className="mono"
                        style={{
                          color: "var(--green-deep)",
                          border: "1px solid color-mix(in oklch, var(--green) 40%, var(--border))",
                          borderRadius: 4,
                          padding: "1px 6px",
                          fontSize: 10.5,
                          textDecoration: "none",
                        }}
                        title={`${livrablesByTask.get(t.id)} livrable(s) issus de cette tâche`}
                      >
                        ↗ {livrablesByTask.get(t.id)} liv
                      </a>
                    )}
                    <Badge>{srcLabel}</Badge>
                    <Confidence value={t.confidence} />
                    <span className="mono" style={{ color: "var(--muted)", minWidth: 50 }}>
                      {t.jh_estime ? `${t.jh_estime} jh` : "—"}
                    </span>
                    <span className="mono" style={{ color: "var(--muted)", minWidth: 54 }}>
                      {t.owner}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
