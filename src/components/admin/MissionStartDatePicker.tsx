"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { formatDateFr } from "@/lib/dates";
import Button from "@/components/ui/Button";

export default function MissionStartDatePicker() {
  const {
    missionStartDate,
    setMissionStartDate,
    initializeWeekDates,
    fetchMissionState,
    fetchLivrables,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(missionStartDate || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      await setMissionStartDate(date);
      await initializeWeekDates(date);
      await Promise.all([fetchMissionState(), fetchLivrables()]);
      setEditing(false);
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  if (!editing && missionStartDate) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 border"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "6px",
          background: "white",
        }}
      >
        <span className="mono-label" style={{ color: "var(--color-muted)" }}>
          DEBUT MISSION
        </span>
        <span className="text-sm" style={{ color: "var(--color-ink)" }}>
          {formatDateFr(missionStartDate)}
        </span>
        <button
          onClick={() => {
            setDate(missionStartDate);
            setEditing(true);
          }}
          className="mono-label ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ color: "var(--color-green)" }}
        >
          MODIFIER
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 px-3 py-2 border"
      style={{
        borderColor: "var(--color-green)",
        borderRadius: "6px",
        background: "white",
      }}
    >
      <span className="mono-label" style={{ color: "var(--color-muted)" }}>
        DEBUT MISSION
      </span>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="text-sm px-2 py-1 border min-h-[44px]"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "4px",
          color: "var(--color-ink)",
        }}
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!date || saving}>
          {saving ? "..." : "VALIDER"}
        </Button>
        {missionStartDate && (
          <Button variant="secondary" onClick={() => setEditing(false)}>
            ANNULER
          </Button>
        )}
      </div>
    </div>
  );
}
