"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

const EVENT_ICONS: Record<string, string> = {
  decision: "\u25C6",
  upload: "\u2191",
  opportunity: "\u2605",
  recalib: "\u27F3",
  task: "\u25B6",
  risk: "\u26A0",
};

const EVENT_COLORS: Record<string, string> = {
  decision: "var(--color-green)",
  upload: "var(--color-amber)",
  opportunity: "var(--color-green)",
  recalib: "var(--color-copper)",
  task: "var(--color-ink)",
  risk: "var(--color-alert)",
};

export default function AdminJournal() {
  const { events, fetchEvents } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchEvents().then(() => setLoaded(true));
  }, [fetchEvents]);

  if (!loaded) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-muted)" }}>
        Chargement...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
        Journal de Mission
      </h1>

      <p className="mono-label" style={{ color: "var(--color-muted)" }}>
        {events.length} EVENEMENTS
      </p>

      <div className="space-y-3">
        {events.map((evt) => (
          <Card key={evt.id}>
            <div className="flex items-start gap-3">
              <span
                className="text-lg mt-0.5"
                style={{ color: EVENT_COLORS[evt.type] || "var(--color-muted)" }}
              >
                {EVENT_ICONS[evt.type] || "\u25CF"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label={evt.type} color={EVENT_COLORS[evt.type]} />
                  <Badge label={`S${evt.weekId}`} />
                  <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                    {evt.date}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                  {evt.label}
                </p>
                {evt.content && (
                  <p
                    className="text-xs mt-1 line-clamp-3"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {evt.content}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "var(--color-muted)" }}>
            Aucun \u00e9v\u00e9nement
          </p>
        )}
      </div>
    </div>
  );
}
