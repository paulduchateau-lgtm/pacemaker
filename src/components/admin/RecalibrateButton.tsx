"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useStore } from "@/store";

export default function RecalibrateButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentWeek = useStore((s) => s.currentWeek);

  const handleRecalibrate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/llm/recalibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentWeek, scope: "full_plan" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erreur : ${data.error}`);
        setLoading(false);
        return;
      }
      // Reload complet : le store Zustand (tasks/livrables/events/project)
      // a été rempli par les useEffect et ne se rafraîchit pas tout seul
      // après une recalibration. window.location.reload() garantit que
      // l'UI reflète vraiment le nouveau plan (tasks + livrables + rapports
      // + weeks éventuellement modifiées).
      window.location.reload();
    } catch {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleRecalibrate} disabled={loading} variant="secondary">
        {loading
          ? "⧳ RECALIBRATION EN COURS (20-30s)..."
          : "⟳ RECALIBRER LE PLAN"}
      </Button>
      {loading && (
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          Pacemaker repense le plan complet en tenant compte des décisions
          actives. La page se rafraîchit en fin de recalibration.
        </p>
      )}
      {error && (
        <div
          className="text-sm p-3"
          style={{
            color: "var(--color-alert)",
            backgroundColor: "#FDECEA",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
