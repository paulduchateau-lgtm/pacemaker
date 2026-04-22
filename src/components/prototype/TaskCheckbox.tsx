"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COLOR: Record<string, string> = {
  "à faire": "var(--muted)",
  "en cours": "var(--sky)",
  "bloqué": "var(--alert)",
  "fait": "var(--green-deep)",
};

export default function TaskCheckbox({
  taskId,
  slug,
  initialStatus,
}: {
  taskId: string;
  slug: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (busy) return;
    const next = status === "fait" ? "à faire" : "fait";
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      const res = await fetch("/api/data/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({ id: taskId, status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }

  const color = COLOR[status] ?? "var(--muted)";
  const checked = status === "fait";
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={checked ? "Marquer à refaire" : "Marquer comme fait"}
      title={checked ? "Décocher (remet à faire)" : "Cocher (marquer fait)"}
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: `1.5px solid ${color}`,
        background: checked ? color : "transparent",
        flexShrink: 0,
        cursor: busy ? "wait" : "pointer",
        padding: 0,
        display: "grid",
        placeItems: "center",
        color: "var(--paper)",
        opacity: busy ? 0.5 : 1,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 8L6.5 11.5L13 4.5" />
        </svg>
      )}
    </button>
  );
}
