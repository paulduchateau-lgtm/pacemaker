"use client";

import { useState } from "react";
import type { Task, TaskStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import { useStore } from "@/store";
import TaskDetail from "./TaskDetail";

const STATUSES: TaskStatus[] = ["\u00e0 faire", "en cours", "bloqu\u00e9", "fait"];

export default function TaskRow({ task }: { task: Task }) {
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const deleteTask = useStore((s) => s.deleteTask);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b" style={{ borderColor: "var(--color-border)" }}>
      {/* Header row — clickable to expand */}
      <div
        className="flex items-start md:items-center gap-2 md:gap-3 py-2 px-3 cursor-pointer min-h-[44px]"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className="text-xs mt-1 md:mt-0 flex-shrink-0"
          style={{ color: "var(--color-muted)" }}
        >
          {expanded ? "\u25BC" : "\u25B6"}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: "var(--color-ink)" }}>
            {task.label}
          </p>
          {!expanded && task.description && (
            <p
              className="text-xs mt-0.5 line-clamp-1"
              style={{ color: "var(--color-muted)" }}
            >
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <Badge label={task.owner} />
          <Badge
            label={task.priority}
            color={
              task.priority === "haute"
                ? "var(--color-alert)"
                : task.priority === "basse"
                  ? "var(--color-muted)"
                  : "var(--color-amber)"
            }
          />
          <select
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              updateTaskStatus(task.id, e.target.value as TaskStatus);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mono-label bg-transparent border px-2 py-1 text-xs min-h-[32px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-ink)",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id);
            }}
            className="text-xs px-2 py-1 opacity-40 hover:opacity-100 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
            style={{ color: "var(--color-alert)" }}
            title="Supprimer"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* Expandable detail panel */}
      {expanded && <TaskDetail task={task} />}
    </div>
  );
}
