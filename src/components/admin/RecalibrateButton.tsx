"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useStore } from "@/store";

export default function RecalibrateButton() {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const currentWeek = useStore((s) => s.currentWeek);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const fetchEvents = useStore((s) => s.fetchEvents);

  const handleRecalibrate = async () => {
    setLoading(true);
    setNotes(null);
    try {
      const res = await fetch("/api/llm/recalibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentWeek }),
      });
      const data = await res.json();
      if (data.error) {
        setNotes(`Erreur : ${data.error}`);
      } else {
        setNotes(data.notes);
        await Promise.all([fetchTasks(), fetchEvents()]);
      }
    } catch {
      setNotes("Erreur réseau");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleRecalibrate} disabled={loading} variant="secondary">
        {loading ? "⧳ RECALIBRATION..." : "⟳ RECALIBRER LE PLAN"}
      </Button>
      {notes && (
        <div
          className="text-sm p-3 border"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-ink)",
          }}
        >
          <p className="mono-label mb-1" style={{ color: "var(--color-muted)" }}>
            NOTES DE RECALIBRATION
          </p>
          {notes}
        </div>
      )}
    </div>
  );
}
