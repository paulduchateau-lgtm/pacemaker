"use client";

import { useState } from "react";
import type { Week, Task } from "@/types";
import { useStore } from "@/store";
import { getTaskStats } from "@/lib/computed";
import { formatDateShort, computeDelta } from "@/lib/dates";
import { PHASE_COLORS } from "@/config/phases";
import ProgressBar from "@/components/ui/ProgressBar";
import DeltaIndicator from "@/components/ui/DeltaIndicator";
import TaskRow from "./TaskRow";
import AddTaskInline from "./AddTaskInline";
import UploadZone from "./UploadZone";
import DateChangeModal from "./DateChangeModal";

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
  const [dateModal, setDateModal] = useState(false);
  const { fetchMissionState, fetchLivrables } = useStore();
  const stats = getTaskStats(tasks);
  const phaseColor = PHASE_COLORS[week.phase];

  const hasDates = week.startDate && week.endDate;
  const delta =
    week.endDate && week.baselineEndDate
      ? computeDelta(week.baselineEndDate, week.endDate)
      : 0;

  const handleDateSaved = async () => {
    setDateModal(false);
    await Promise.all([fetchMissionState(), fetchLivrables()]);
  };

  return (
    <>
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
          className="w-full flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-3 text-left min-h-[44px]"
        >
          <span className="text-xs" style={{ color: phaseColor }}>
            {open ? "▼" : "▶"}
          </span>
          <span
            className="mono-label px-2 py-0.5"
            style={{ color: phaseColor, border: `1px solid ${phaseColor}`, borderRadius: "4px" }}
          >
            S{week.id}
          </span>
          <span className="text-sm font-medium flex-1 min-w-0" style={{ color: "var(--color-ink)" }}>
            {week.title}
          </span>
          {hasDates && (
            <span
              className="mono-label hidden md:inline cursor-pointer"
              style={{ color: "var(--color-muted)" }}
              onClick={(e) => {
                e.stopPropagation();
                setDateModal(true);
              }}
              title="Modifier les dates"
            >
              {formatDateShort(week.startDate!)} → {formatDateShort(week.endDate!)}
            </span>
          )}
          {delta !== 0 && (
            <span className="hidden md:inline">
              <DeltaIndicator delta={delta} compact />
            </span>
          )}
          <span className="mono-label hidden md:inline" style={{ color: "var(--color-muted)" }}>
            {week.phase}
          </span>
          <span className="mono-label" style={{ color: "var(--color-muted)" }}>
            {week.budget_jh} JH
          </span>
          <div className="w-16 md:w-24">
            <ProgressBar pct={stats.pct} color={phaseColor} />
          </div>
          <span className="mono-label" style={{ color: "var(--color-muted)" }}>
            {stats.done}/{stats.total}
          </span>
        </button>

        {open && hasDates && (
          <div
            className="flex items-center gap-2 px-4 py-1 md:hidden border-t"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span className="mono-label" style={{ color: "var(--color-muted)" }}>
              {formatDateShort(week.startDate!)} → {formatDateShort(week.endDate!)}
            </span>
            {delta !== 0 && <DeltaIndicator delta={delta} compact />}
            <button
              onClick={() => setDateModal(true)}
              className="mono-label ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ color: "var(--color-green)" }}
            >
              MODIFIER
            </button>
          </div>
        )}

        {open && (
          <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
            {tasks.length === 0 && (
              <p
                className="text-sm py-3 px-4 italic"
                style={{ color: "var(--color-muted)" }}
              >
                {"Aucune tâche"}
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

      {dateModal && week.startDate && (
        <DateChangeModal
          weekId={week.id}
          currentStartDate={week.startDate}
          onClose={() => setDateModal(false)}
          onSaved={handleDateSaved}
        />
      )}
    </>
  );
}
