"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/store";
import { getWeekTasks } from "@/lib/computed";
import PhaseProgress from "@/components/client/PhaseProgress";
import CurrentWeekCard from "@/components/client/CurrentWeekCard";
import RisksSummary from "@/components/client/RisksSummary";
import LivrablesGrid from "@/components/client/LivrablesGrid";
import DecisionsTimeline from "@/components/client/DecisionsTimeline";
import RoiStrip from "@/components/client/RoiStrip";

export default function ClientDashboard() {
  const params = useParams<{ slug: string }>();
  const missionSlug = params?.slug ?? "";
  const {
    weeks,
    tasks,
    risks,
    livrables,
    currentWeek,
    fetchMissionState,
    fetchTasks,
    fetchRisks,
    fetchLivrables,
  } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchMissionState(),
      fetchTasks(),
      fetchRisks(),
      fetchLivrables(),
    ]).then(() => setLoaded(true));
  }, [fetchMissionState, fetchTasks, fetchRisks, fetchLivrables]);

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
          <DecisionsTimeline missionSlug={missionSlug} />
        </div>
      </div>
    </div>
  );
}
