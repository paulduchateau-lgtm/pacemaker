"use client";

import type { Task } from "@/types";
import { PHASES, PHASE_COLORS } from "@/config/phases";
import { getPhaseProgress } from "@/lib/computed";
import ProgressBar from "@/components/ui/ProgressBar";

export default function PhaseProgress({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-3">
      {PHASES.map((phase) => {
        const progress = getPhaseProgress(tasks, phase);
        return (
          <div key={phase} className="flex items-center gap-3">
            <span
              className="mono-label w-28 text-right"
              style={{ color: PHASE_COLORS[phase] }}
            >
              {phase.toUpperCase()}
            </span>
            <div className="flex-1">
              <ProgressBar pct={progress.pct} color={PHASE_COLORS[phase]} />
            </div>
            <span className="mono-label w-12 text-right" style={{ color: "var(--color-muted)" }}>
              {progress.pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
