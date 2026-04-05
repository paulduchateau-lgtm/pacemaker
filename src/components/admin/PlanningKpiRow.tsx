"use client";

import { useStore } from "@/store";
import { computeGlobalDelta, computePhaseDelta } from "@/lib/dates";
import { PHASES } from "@/config/phases";
import DeltaIndicator from "@/components/ui/DeltaIndicator";

export default function PlanningKpiRow() {
  const { weeks } = useStore();

  const hasBaseline = weeks.some((w) => w.baselineStartDate);
  if (!hasBaseline) return null;

  const globalDelta = computeGlobalDelta(weeks);

  return (
    <div
      className="border px-3 py-2 space-y-2"
      style={{
        borderColor: "var(--color-border)",
        borderRadius: "6px",
        background: "white",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          PLANNING
        </span>
        <DeltaIndicator delta={globalDelta} label="Global" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {PHASES.map((phase) => {
          const delta = computePhaseDelta(weeks, phase);
          if (delta === 0) return null;
          return (
            <DeltaIndicator
              key={phase}
              delta={delta}
              label={phase}
              compact
            />
          );
        })}
      </div>
    </div>
  );
}
