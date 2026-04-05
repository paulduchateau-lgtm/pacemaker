"use client";

import type { MissionEvent } from "@/types";
import Card from "@/components/ui/Card";

export default function DecisionsTimeline({
  events,
}: {
  events: MissionEvent[];
}) {
  const decisions = events.filter((e) => e.type === "decision");

  return (
    <Card>
      <p className="mono-label mb-3" style={{ color: "var(--color-muted)" }}>
        DECISIONS ({decisions.length})
      </p>
      <div className="space-y-3">
        {decisions.map((evt) => (
          <div
            key={evt.id}
            className="flex items-start gap-3 pb-3 border-b last:border-b-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span style={{ color: "var(--color-green)" }}>&#x25C6;</span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                  S{evt.weekId}
                </span>
                <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                  {evt.date}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                {evt.label}
              </p>
            </div>
          </div>
        ))}
        {decisions.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Aucune d\u00e9cision enregistr\u00e9e
          </p>
        )}
      </div>
    </Card>
  );
}
