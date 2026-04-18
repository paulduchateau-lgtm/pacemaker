"use client";

import { useState } from "react";
import type { Incoherence } from "@/lib/incoherences";

const KIND_LABELS: Record<Incoherence["kind"], string> = {
  factual: "Contradiction factuelle",
  scope_drift: "Dérive de périmètre",
  constraint_change: "Contrainte modifiée",
  hypothesis_invalidated: "Hypothèse invalidée",
};

const SEVERITY_COLORS: Record<Incoherence["severity"], string> = {
  minor: "var(--color-muted)",
  moderate: "var(--color-amber)",
  major: "var(--color-alert)",
};

const STATUS_LABELS: Record<Incoherence["resolutionStatus"], string> = {
  pending: "À TRANCHER",
  auto_resolved: "AUTO-RÉSOLUE",
  user_acknowledged: "VALIDÉE",
  user_rejected: "REJETÉE",
  ignored: "IGNORÉE",
};

export default function IncoherenceCard({
  incoherence,
  onStatusChange,
}: {
  incoherence: Incoherence;
  onStatusChange?: (
    id: string,
    status: Incoherence["resolutionStatus"],
  ) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: Incoherence["resolutionStatus"]) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/incoherences/${incoherence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok && onStatusChange) onStatusChange(incoherence.id, status);
    } finally {
      setBusy(false);
    }
  }

  const isPending = incoherence.resolutionStatus === "pending";

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${SEVERITY_COLORS[incoherence.severity]}`,
        borderRadius: "6px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="mono-label mb-1"
            style={{ color: SEVERITY_COLORS[incoherence.severity] }}
          >
            ⚠ {incoherence.severity.toUpperCase()} · {KIND_LABELS[incoherence.kind]}
          </div>
          <div
            className="text-sm font-medium"
            style={{ color: "var(--color-ink)" }}
          >
            {incoherence.description}
          </div>
          <div
            className="mono-label mt-2"
            style={{ color: "var(--color-muted)" }}
          >
            Conflit avec {incoherence.conflictingEntityType} ·{" "}
            {incoherence.conflictingEntityId}
          </div>
        </div>
        <span
          className="mono-label shrink-0"
          style={{
            color:
              incoherence.resolutionStatus === "user_acknowledged"
                ? "var(--color-green)"
                : "var(--color-muted)",
          }}
        >
          {STATUS_LABELS[incoherence.resolutionStatus]}
        </span>
      </div>

      {incoherence.autoResolution && (
        <div
          className="mt-3 pt-3 text-sm"
          style={{
            borderTop: "1px solid var(--color-border)",
            color: "var(--color-ink)",
          }}
        >
          <div
            className="mono-label mb-1"
            style={{ color: "var(--color-muted)" }}
          >
            PROPOSITION DE L&apos;AGENT
          </div>
          <div>{incoherence.autoResolution}</div>
        </div>
      )}

      {isPending && (
        <div
          className="mt-3 pt-3 flex flex-wrap gap-2"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => setStatus("user_acknowledged")}
            disabled={busy}
            className="mono-label px-3 py-1.5"
            style={{
              backgroundColor: "var(--color-green)",
              color: "var(--color-ink)",
              borderRadius: "6px",
              opacity: busy ? 0.5 : 1,
            }}
          >
            ✓ JE VALIDE
          </button>
          <button
            onClick={() => setStatus("user_rejected")}
            disabled={busy}
            className="mono-label px-3 py-1.5"
            style={{
              color: "var(--color-alert)",
              border: "1px solid var(--color-alert)",
              borderRadius: "6px",
              opacity: busy ? 0.5 : 1,
            }}
          >
            ✕ JE REJETTE
          </button>
          <button
            onClick={() => setStatus("ignored")}
            disabled={busy}
            className="mono-label px-3 py-1.5"
            style={{
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              opacity: busy ? 0.5 : 1,
            }}
          >
            IGNORER
          </button>
        </div>
      )}
    </div>
  );
}
