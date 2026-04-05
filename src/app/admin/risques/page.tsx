"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { riskScore } from "@/lib/computed";
import RiskRow from "@/components/admin/RiskRow";
import AddRiskForm from "@/components/admin/AddRiskForm";
import KpiCard from "@/components/ui/KpiCard";

export default function AdminRisques() {
  const { risks, fetchRisks } = useStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchRisks().then(() => setLoaded(true));
  }, [fetchRisks]);

  if (!loaded) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-muted)" }}>
        Chargement...
      </p>
    );
  }

  const activeRisks = risks.filter((r) => r.status === "actif");
  const sorted = [...risks].sort((a, b) => riskScore(b) - riskScore(a));
  const maxScore = risks.length > 0 ? Math.max(...risks.map(riskScore)) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
        Registre des Risques
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="RISQUES ACTIFS" value={activeRisks.length} />
        <KpiCard label="TOTAL" value={risks.length} />
        <KpiCard label="SCORE MAX" value={maxScore} />
      </div>

      <div
        className="border bg-white"
        style={{ borderColor: "var(--color-border)", borderRadius: "6px" }}
      >
        {sorted.map((risk) => (
          <RiskRow key={risk.id} risk={risk} />
        ))}
      </div>

      <AddRiskForm />
    </div>
  );
}
