"use client";

import type { Week, Task } from "@/types";
import { getTaskStats } from "@/lib/computed";
import { PHASE_COLORS } from "@/config/phases";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

interface CurrentWeekCardProps {
  week: Week;
  tasks: Task[];
}

export default function CurrentWeekCard({ week, tasks }: CurrentWeekCardProps) {
  const stats = getTaskStats(tasks);

  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <span
          className="mono-label px-2 py-0.5"
          style={{
            color: PHASE_COLORS[week.phase],
            border: `1px solid ${PHASE_COLORS[week.phase]}`,
            borderRadius: "4px",
          }}
        >
          S{week.id}
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          {week.title}
        </span>
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          {week.phase}
        </span>
      </div>

      <ProgressBar pct={stats.pct} color={PHASE_COLORS[week.phase]} height={8} />

      <div className="flex gap-6 mt-3">
        <div>
          <p className="mono-label" style={{ color: "var(--color-muted)" }}>TACHES</p>
          <p className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
            {stats.done}/{stats.total}
          </p>
        </div>
        {stats.blocked > 0 && (
          <div>
            <p className="mono-label" style={{ color: "var(--color-alert)" }}>BLOQUEES</p>
            <p className="text-lg font-medium" style={{ color: "var(--color-alert)" }}>
              {stats.blocked}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="mono-label mb-1" style={{ color: "var(--color-muted)" }}>
          LIVRABLES ATTENDUS
        </p>
        <ul className="text-sm space-y-0.5" style={{ color: "var(--color-ink)" }}>
          {week.livrables.map((l) => (
            <li key={l}>&#x25B8; {l}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
