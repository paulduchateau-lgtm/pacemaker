"use client";

import type { Task, Livrable } from "@/types";
import { getAllTaskStats, getLivrableStats } from "@/lib/computed";

interface RoiStripProps {
  tasks: Task[];
  livrables: Livrable[];
  currentWeek: number;
}

export default function RoiStrip({
  tasks,
  livrables,
  currentWeek,
}: RoiStripProps) {
  const taskStats = getAllTaskStats(tasks);
  const livStats = getLivrableStats(livrables);
  const weekProgress = Math.round((currentWeek / 7) * 100);

  return (
    <div
      className="grid grid-cols-4 gap-4 p-4 border"
      style={{
        borderColor: "var(--color-border)",
        borderRadius: "6px",
        backgroundColor: "white",
      }}
    >
      <div className="text-center">
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          AVANCEMENT TEMPS
        </p>
        <p className="text-2xl font-medium" style={{ color: "var(--color-ink)" }}>
          {weekProgress}%
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          S{currentWeek}/7
        </p>
      </div>
      <div className="text-center">
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          AVANCEMENT TACHES
        </p>
        <p className="text-2xl font-medium" style={{ color: "var(--color-ink)" }}>
          {taskStats.pct}%
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          {taskStats.done}/{taskStats.total}
        </p>
      </div>
      <div className="text-center">
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          LIVRABLES LIVRES
        </p>
        <p className="text-2xl font-medium" style={{ color: "var(--color-ink)" }}>
          {livStats.delivered}
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          / {livStats.total}
        </p>
      </div>
      <div className="text-center">
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          LIVRABLES VALIDES
        </p>
        <p className="text-2xl font-medium" style={{ color: "var(--color-green)" }}>
          {livStats.validated}
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          / {livStats.total}
        </p>
      </div>
    </div>
  );
}
