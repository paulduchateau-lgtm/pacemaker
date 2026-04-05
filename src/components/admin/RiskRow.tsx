"use client";

import type { Risk, RiskStatus } from "@/types";
import { riskScore } from "@/lib/computed";
import { useStore } from "@/store";

const RISK_STATUSES: RiskStatus[] = ["actif", "mitigé", "clos"];

export default function RiskRow({ risk }: { risk: Risk }) {
  const updateRiskStatus = useStore((s) => s.updateRiskStatus);
  const score = riskScore(risk);

  return (
    <div
      className="flex items-center gap-3 py-3 px-4 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div
        className="w-8 h-8 flex items-center justify-center font-mono text-xs font-medium"
        style={{
          backgroundColor:
            score >= 12
              ? "rgba(217,91,47,0.15)"
              : score >= 6
                ? "rgba(232,163,23,0.15)"
                : "rgba(165,217,0,0.1)",
          color:
            score >= 12
              ? "var(--color-alert)"
              : score >= 6
                ? "var(--color-amber)"
                : "var(--color-green)",
          borderRadius: "4px",
        }}
      >
        {score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--color-ink)" }}>
          {risk.label}
        </p>
        {risk.mitigation && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {risk.mitigation}
          </p>
        )}
      </div>
      <span className="mono-label" style={{ color: "var(--color-muted)" }}>
        I:{risk.impact} P:{risk.probability}
      </span>
      <select
        value={risk.status}
        onChange={(e) =>
          updateRiskStatus(risk.id, e.target.value as RiskStatus)
        }
        className="mono-label bg-transparent border px-2 py-1 text-xs"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "4px",
          color: "var(--color-ink)",
        }}
      >
        {RISK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
