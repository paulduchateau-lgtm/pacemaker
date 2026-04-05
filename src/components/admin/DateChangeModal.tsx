"use client";

import { useState } from "react";
import { useStore } from "@/store";
import type { ScheduleChangeType } from "@/types";
import Button from "@/components/ui/Button";

interface DateChangeModalProps {
  weekId: number;
  currentStartDate: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function DateChangeModal({
  weekId,
  currentStartDate,
  onClose,
  onSaved,
}: DateChangeModalProps) {
  const { changeWeekDate } = useStore();
  const [newDate, setNewDate] = useState(currentStartDate);
  const [cascade, setCascade] = useState(true);
  const [planned, setPlanned] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const changeType: ScheduleChangeType = planned
    ? "recalage_planifie"
    : "deviation";

  const handleSave = async () => {
    if (!newDate || newDate === currentStartDate) return;
    setSaving(true);
    try {
      await changeWeekDate({
        weekId,
        newStartDate: newDate,
        cascade,
        changeType,
        reason,
      });
      onSaved();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,28,26,0.5)" }}
    >
      <div
        className="w-full max-w-md p-4 space-y-4"
        style={{
          background: "var(--color-paper)",
          borderRadius: "6px",
          border: "1px solid var(--color-border)",
        }}
      >
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--color-ink)" }}
        >
          Modifier la date — Semaine {weekId}
        </h3>

        <div className="space-y-2">
          <label className="mono-label block" style={{ color: "var(--color-muted)" }}>
            NOUVELLE DATE DE DEBUT
          </label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full text-sm px-2 py-2 border min-h-[44px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-ink)",
            }}
          />
        </div>

        <label
          className="flex items-center gap-2 min-h-[44px] cursor-pointer"
        >
          <input
            type="checkbox"
            checked={cascade}
            onChange={(e) => setCascade(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm" style={{ color: "var(--color-ink)" }}>
            Décaler les semaines suivantes
          </span>
        </label>

        <label
          className="flex items-center gap-2 min-h-[44px] cursor-pointer"
        >
          <input
            type="checkbox"
            checked={planned}
            onChange={(e) => setPlanned(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm" style={{ color: "var(--color-ink)" }}>
            Recalage planifié (ne pas tracer comme déviation)
          </span>
        </label>

        <div className="space-y-1">
          <label className="mono-label block" style={{ color: "var(--color-muted)" }}>
            MOTIF (OPTIONNEL)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison du décalage..."
            className="w-full text-sm px-2 py-2 border min-h-[44px]"
            style={{
              borderColor: "var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-ink)",
            }}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            ANNULER
          </Button>
          <Button onClick={handleSave} disabled={saving || newDate === currentStartDate}>
            {saving ? "..." : "APPLIQUER"}
          </Button>
        </div>
      </div>
    </div>
  );
}
