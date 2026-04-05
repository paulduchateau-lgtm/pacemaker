"use client";

import { useState } from "react";
import { useStore } from "@/store";
import Button from "@/components/ui/Button";
import type { TaskOwner, TaskPriority } from "@/types";

export default function AddTaskInline({ weekId }: { weekId: number }) {
  const addTask = useStore((s) => s.addTask);
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState<TaskOwner>("Paul");
  const [priority, setPriority] = useState<TaskPriority>("moyenne");

  const handleSubmit = async () => {
    if (!label.trim()) return;
    await addTask({
      weekId,
      label: label.trim(),
      owner,
      priority,
      status: "à faire",
      source: "manual",
    });
    setLabel("");
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Nouvelle t\u00e2che..."
        className="flex-1 text-sm bg-transparent border-b px-1 py-1 outline-none"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-ink)",
        }}
      />
      <select
        value={owner}
        onChange={(e) => setOwner(e.target.value as TaskOwner)}
        className="mono-label bg-transparent border px-2 py-1 text-xs"
        style={{ borderColor: "var(--color-border)", borderRadius: "4px" }}
      >
        <option value="Paul">Paul</option>
        <option value="Paul B.">Paul B.</option>
        <option value="Client">Client</option>
      </select>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as TaskPriority)}
        className="mono-label bg-transparent border px-2 py-1 text-xs"
        style={{ borderColor: "var(--color-border)", borderRadius: "4px" }}
      >
        <option value="haute">haute</option>
        <option value="moyenne">moyenne</option>
        <option value="basse">basse</option>
      </select>
      <Button onClick={handleSubmit} disabled={!label.trim()}>
        +
      </Button>
    </div>
  );
}
