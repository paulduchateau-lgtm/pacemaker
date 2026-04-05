"use client";

import type { Risk } from "@/types";
import { riskScore } from "@/lib/computed";
import Card from "@/components/ui/Card";

export default function RisksSummary({ risks }: { risks: Risk[] }) {
  const activeRisks = risks
    .filter((r) => r.status === "actif")
    .sort((a, b) => riskScore(b) - riskScore(a))
    .slice(0, 5);

  return (
    <Card>
      <p className="mono-label mb-3" style={{ color: "var(--color-muted)" }}>
        RISQUES ACTIFS ({activeRisks.length})
      </p>
      <div className="space-y-2">
        {activeRisks.map((risk) => {
          const score = riskScore(risk);
          return (
            <div key={risk.id} className="flex items-center gap-3">
              <span
                className="font-mono text-xs font-medium w-6 text-center"
                style={{
                  color:
                    score >= 12
                      ? "var(--color-alert)"
                      : score >= 6
                        ? "var(--color-amber)"
                        : "var(--color-green)",
                }}
              >
                {score}
              </span>
              <span className="text-sm flex-1" style={{ color: "var(--color-ink)" }}>
                {risk.label}
              </span>
            </div>
          );
        })}
        {activeRisks.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Aucun risque actif
          </p>
        )}
      </div>
    </Card>
  );
}
