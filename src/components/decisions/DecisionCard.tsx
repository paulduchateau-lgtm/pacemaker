"use client";

import { useState } from "react";
import type { Decision } from "@/types";

const STATUS_COLORS: Record<Decision["status"], string> = {
  proposée: "var(--color-amber)",
  actée: "var(--color-green)",
  révisée: "var(--color-muted)",
  annulée: "var(--color-alert)",
};

const AUTHOR_LABELS: Record<Decision["author"], string> = {
  paul: "Paul",
  paul_b: "Paul B.",
  client: "Client",
  agent: "Pacemaker",
};

export default function DecisionCard({ decision }: { decision: Decision }) {
  const [open, setOpen] = useState(false);

  const hasRationale =
    decision.rationale && decision.rationale.trim().length > 0;
  const isLegacy = decision.rationaleSource === "legacy_no_rationale";

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-sm"
            style={{ color: "var(--color-ink)" }}
          >
            {decision.statement}
          </div>
          <div
            className="mono-label mt-1 flex items-center gap-3"
            style={{ color: "var(--color-muted)" }}
          >
            <span>{AUTHOR_LABELS[decision.author]}</span>
            <span>·</span>
            <span>{decision.actedAt.slice(0, 10)}</span>
            {decision.weekId !== null && (
              <>
                <span>·</span>
                <span>S{decision.weekId}</span>
              </>
            )}
            {decision.confidence !== null && (
              <>
                <span>·</span>
                <span>CONF {Math.round(decision.confidence * 100)}%</span>
              </>
            )}
          </div>
        </div>
        <span
          className="mono-label shrink-0"
          style={{ color: STATUS_COLORS[decision.status] }}
        >
          {decision.status.toUpperCase()}
        </span>
      </div>

      {(hasRationale || (decision.alternatives && decision.alternatives.length) || isLegacy) && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mono-label mt-3"
          style={{ color: "var(--color-green)" }}
        >
          {open ? "▲ MASQUER MOTIFS" : "▼ MOTIFS / ALTERNATIVES"}
        </button>
      )}

      {open && (
        <div
          className="mt-3 pt-3 text-sm space-y-2"
          style={{
            borderTop: "1px solid var(--color-border)",
            color: "var(--color-ink)",
          }}
        >
          {hasRationale ? (
            <div>
              <div
                className="mono-label mb-1"
                style={{ color: "var(--color-muted)" }}
              >
                MOTIFS
              </div>
              <div className="whitespace-pre-wrap">{decision.rationale}</div>
            </div>
          ) : (
            <div
              className="mono-label italic"
              style={{ color: "var(--color-muted)" }}
            >
              {isLegacy
                ? "Décision migrée depuis l'historique — motifs non capturés à l'époque."
                : "Aucun motif consigné."}
            </div>
          )}

          {decision.alternatives && decision.alternatives.length > 0 && (
            <div>
              <div
                className="mono-label mb-1"
                style={{ color: "var(--color-muted)" }}
              >
                ALTERNATIVES ENVISAGÉES
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {decision.alternatives.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="mono-label pt-2"
            style={{ color: "var(--color-muted)" }}
          >
            Source : {decision.sourceType} ·{" "}
            rationale : {decision.rationaleSource}
          </div>
        </div>
      )}
    </div>
  );
}
