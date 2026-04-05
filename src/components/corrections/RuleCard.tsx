"use client";

import type { Correction } from "@/types";

interface Props {
  correction: Correction;
  onArchive: (id: string) => void;
}

export default function RuleCard({ correction, onArchive }: Props) {
  return (
    <div
      className="p-4 border"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "white",
        borderRadius: "6px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm" style={{ color: "var(--color-ink)" }}>
            {correction.ruleLearned}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--color-muted)" }}
          >
            {correction.diffSummary}
          </p>
        </div>
        <button
          onClick={() => onArchive(correction.id)}
          className="font-mono uppercase tracking-wider px-2 py-1 border min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            borderColor: "var(--color-border)",
            color: "var(--color-muted)",
            borderRadius: "6px",
          }}
        >
          Archiver
        </button>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span
          className="font-mono uppercase tracking-wider"
          style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: "var(--color-muted)",
          }}
        >
          {correction.generationType}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "10px", color: "var(--color-green)" }}
        >
          {correction.appliedCount}x appliquée
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "10px", color: "var(--color-muted)" }}
        >
          {new Date(correction.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
    </div>
  );
}
