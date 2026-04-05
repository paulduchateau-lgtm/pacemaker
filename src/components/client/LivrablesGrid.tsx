"use client";

import type { Livrable } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import Card from "@/components/ui/Card";

export default function LivrablesGrid({
  livrables,
}: {
  livrables: Livrable[];
}) {
  return (
    <Card>
      <p className="mono-label mb-3" style={{ color: "var(--color-muted)" }}>
        LIVRABLES ({livrables.length})
      </p>
      <div className="space-y-2">
        {livrables.map((liv) => (
          <div
            key={liv.id}
            className="flex items-center justify-between py-1 border-b last:border-b-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="mono-label" style={{ color: "var(--color-muted)" }}>
                S{liv.weekId}
              </span>
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                {liv.label}
              </span>
            </div>
            <StatusBadge status={liv.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}
