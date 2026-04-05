"use client";

import { useState } from "react";
import type { Week, Task } from "@/types";
import { getTaskStats } from "@/lib/computed";
import { PHASE_COLORS } from "@/config/phases";
import ProgressBar from "@/components/ui/ProgressBar";
import TaskRow from "./TaskRow";
import AddTaskInline from "./AddTaskInline";
import UploadZone from "./UploadZone";

interface WeekAccordionProps {
  week: Week;
  tasks: Task[];
  isCurrent: boolean;
}

export default function WeekAccordion({
  week,
  tasks,
  isCurrent,
}: WeekAccordionProps) {
  const [open, setOpen] = useState(isCurrent);
  const stats = getTaskStats(tasks);
  const phaseColor = PHASE_COLORS[week.phase];

  return (
    <div
      className="border mb-2"
      style={{
        borderColor: isCurrent ? phaseColor : "var(--color-border)",
        borderRadius: "6px",
        borderLeftWidth: isCurrent ? "3px" : "1px",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs" style={{ color: phaseColor }}>
          {open ? "&#x25BC;" : "&#x25B6;"}
        </span>
        <span
          className="mono-label px-2 py-0.5"
          style={{ color: phaseColor, border: `1px solid ${phaseColor}`, borderRadius: "4px" }}
        >
          S{week.id}
        </span>
        <span className="text-sm font-medium flex-1" style={{ color: "var(--color-ink)" }}>
          {week.title}
        </span>
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          {week.phase}
        </span>
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          {week.budget_jh} JH
        </span>
        <div className="w-24">
          <ProgressBar pct={stats.pct} color={phaseColor} />
        </div>
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          {stats.done}/{stats.total}
        </span>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
          {tasks.length === 0 && (
            <p
              className="text-sm py-3 px-4 italic"
              style={{ color: "var(--color-muted)" }}
            >
              Aucune t\u00e2che
            </p>
          )}
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          <AddTaskInline weekId={week.id} />
          <UploadZone weekId={week.id} />
        </div>
      )}
    </div>
  );
}
