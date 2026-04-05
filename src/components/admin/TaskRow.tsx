"use client";

import type { Task, TaskStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import { useStore } from "@/store";

const STATUSES: TaskStatus[] = ["à faire", "en cours", "bloqué", "fait"];

export default function TaskRow({ task }: { task: Task }) {
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const deleteTask = useStore((s) => s.deleteTask);

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
          {task.label}
        </p>
      </div>
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
        onChange={(e) =>
          updateTaskStatus(task.id, e.target.value as TaskStatus)
        }
        className="mono-label bg-transparent border px-2 py-1 text-xs"
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
      <Badge label={task.source} color="var(--color-muted)" />
      <button
        onClick={() => deleteTask(task.id)}
        className="text-xs px-1 opacity-40 hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-alert)" }}
      >
        &#x2715;
      </button>
    </div>
  );
}
