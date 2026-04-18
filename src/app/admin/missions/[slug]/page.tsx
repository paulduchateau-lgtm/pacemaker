"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/store";
import { getWeekTasks, getAllTaskStats } from "@/lib/computed";
import WeekAccordion from "@/components/admin/WeekAccordion";
import RecalibrateButton from "@/components/admin/RecalibrateButton";
import MissionStartDatePicker from "@/components/admin/MissionStartDatePicker";
import PlanningKpiRow from "@/components/admin/PlanningKpiRow";
import TodayHeader from "@/components/ui/TodayHeader";
import KpiCard from "@/components/ui/KpiCard";
import Button from "@/components/ui/Button";
import MissionBriefing from "@/components/briefing/MissionBriefing";

export default function AdminBacklog() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const {
    weeks,
    tasks,
    currentWeek,
    fetchProject,
    fetchTasks,
    fetchLivrables,
  } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([fetchProject(), fetchTasks(), fetchLivrables()]).then(() =>
      setLoaded(true)
    );
  }, [fetchProject, fetchTasks, fetchLivrables]);

  const stats = getAllTaskStats(tasks);

  const handleGenerate = async (weekId: number) => {
    setGenerating(weekId);
    try {
      const res = await fetch("/api/llm/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId }),
      });
      if (res.ok) await fetchTasks();
    } catch {}
    setGenerating(null);
  };

  if (!loaded) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-muted)" }}>
        Chargement...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
            Backlog Mission
          </h1>
          <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
            SEMAINE {currentWeek} / 7
          </p>
        </div>
        <RecalibrateButton />
      </div>

      <MissionBriefing slug={slug} />

      <div className="flex flex-col sm:flex-row gap-3">
        <TodayHeader />
        <MissionStartDatePicker />
      </div>

      <PlanningKpiRow />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="TACHES" value={stats.total} sub={`${stats.done} terminées`} />
        <KpiCard label="AVANCEMENT" value={`${stats.pct}%`} />
        <KpiCard label="SEMAINE" value={`S${currentWeek}`} sub="/ 7" />
      </div>

      <div className="space-y-2">
        {weeks.map((week) => {
          const weekTasks = getWeekTasks(tasks, week.id);
          return (
            <div key={week.id}>
              <WeekAccordion
                week={week}
                tasks={weekTasks}
                isCurrent={week.id === currentWeek}
              />
              {weekTasks.length === 0 && (
                <div className="flex justify-end -mt-1 mb-2 pr-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleGenerate(week.id)}
                    disabled={generating === week.id}
                  >
                    {generating === week.id
                      ? "⧳ GENERATION..."
                      : "✨ GENERER TACHES"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
