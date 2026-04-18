"use client";

import { useEffect, useState } from "react";
import type { Decision } from "@/types";
import Card from "@/components/ui/Card";

/**
 * Chantier 02 : lit désormais `/api/decisions` (table `decisions`) au lieu de
 * filtrer les `events` côté client. Affiche motifs + alternatives si présents.
 */
export default function DecisionsTimeline({
  missionSlug,
}: {
  missionSlug: string;
}) {
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/decisions?status=actée,révisée", {
      headers: { "x-mission-slug": missionSlug },
    })
      .then((r) => r.json())
      .then((j) => setDecisions(j.decisions ?? []))
      .catch(() => setDecisions([]));
  }, [missionSlug]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (decisions === null) {
    return (
      <Card>
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          Chargement des décisions...
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mono-label mb-3" style={{ color: "var(--color-muted)" }}>
        DECISIONS ({decisions.length})
      </p>
      <div className="space-y-3">
        {decisions.map((d) => {
          const open = openIds.has(d.id);
          const hasDetail =
            (d.rationale && d.rationale.trim().length > 0) ||
            (d.alternatives && d.alternatives.length > 0);
          return (
            <div
              key={d.id}
              className="flex items-start gap-3 pb-3 border-b last:border-b-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <span style={{ color: "var(--color-green)" }}>&#x25C6;</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {d.weekId !== null && (
                    <span
                      className="mono-label"
                      style={{ color: "var(--color-muted)" }}
                    >
                      S{d.weekId}
                    </span>
                  )}
                  <span
                    className="mono-label"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {d.actedAt.slice(0, 10)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                  {d.statement}
                </p>
                {hasDetail && (
                  <button
                    onClick={() => toggle(d.id)}
                    className="mono-label mt-1"
                    style={{ color: "var(--color-green)" }}
                  >
                    {open ? "▲ MASQUER" : "▼ MOTIFS"}
                  </button>
                )}
                {open && (
                  <div
                    className="mt-2 text-xs space-y-2 pl-2"
                    style={{
                      borderLeft: "2px solid var(--color-border)",
                      color: "var(--color-ink)",
                    }}
                  >
                    {d.rationale && (
                      <div>
                        <div
                          className="mono-label mb-0.5"
                          style={{ color: "var(--color-muted)" }}
                        >
                          MOTIFS
                        </div>
                        <div className="whitespace-pre-wrap">{d.rationale}</div>
                      </div>
                    )}
                    {d.alternatives && d.alternatives.length > 0 && (
                      <div>
                        <div
                          className="mono-label mb-0.5"
                          style={{ color: "var(--color-muted)" }}
                        >
                          ALTERNATIVES
                        </div>
                        <ul className="list-disc list-inside">
                          {d.alternatives.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {decisions.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Aucune décision enregistrée
          </p>
        )}
      </div>
    </Card>
  );
}
