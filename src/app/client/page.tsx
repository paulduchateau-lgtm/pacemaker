"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { getWeekTasks } from "@/lib/computed";
import PhaseProgress from "@/components/client/PhaseProgress";
import CurrentWeekCard from "@/components/client/CurrentWeekCard";
import RisksSummary from "@/components/client/RisksSummary";
import LivrablesGrid from "@/components/client/LivrablesGrid";
import DecisionsTimeline from "@/components/client/DecisionsTimeline";
import RoiStrip from "@/components/client/RoiStrip";

export default function ClientDashboard() {
  const {
    weeks,
    tasks,
    risks,
    livrables,
    events,
    currentWeek,
    fetchProject,
    fetchTasks,
    fetchRisks,
    fetchLivrables,
    fetchEvents,
  } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchProject(),
      fetchTasks(),
      fetchRisks(),
      fetchLivrables(),
      fetchEvents(),
    ]).then(() => setLoaded(true));
  }, [fetchProject, fetchTasks, fetchRisks, fetchLivrables, fetchEvents]);

  if (!loaded) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-muted)" }}>
        Chargement...
      </p>
    );
  }

  const currentWeekData = weeks.find((w) => w.id === currentWeek);
  const currentTasks = getWeekTasks(tasks, currentWeek);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Mission Transformation BI
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          AGIRC-ARRCO
        </p>
      </div>

      <RoiStrip
        tasks={tasks}
        livrables={livrables}
        currentWeek={currentWeek}
      />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          {currentWeekData && (
            <CurrentWeekCard week={currentWeekData} tasks={currentTasks} />
          )}
          <PhaseProgress tasks={tasks} />
        </div>
        <div className="space-y-6">
          <RisksSummary risks={risks} />
          <LivrablesGrid livrables={livrables} />
          <DecisionsTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
