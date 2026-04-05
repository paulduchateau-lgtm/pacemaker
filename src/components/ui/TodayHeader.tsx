"use client";

import { formatTodayFr } from "@/lib/dates";

export default function TodayHeader() {
  const today = formatTodayFr();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border"
      style={{
        borderColor: "var(--color-border)",
        borderRadius: "6px",
        background: "white",
      }}
    >
      <span
        className="mono-label"
        style={{ color: "var(--color-green)" }}
      >
        AUJOURD{"'"}HUI
      </span>
      <span
        className="text-sm"
        style={{ color: "var(--color-ink)" }}
      >
        {today}
      </span>
    </div>
  );
}
