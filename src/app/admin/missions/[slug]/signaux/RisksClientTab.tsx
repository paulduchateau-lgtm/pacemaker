"use client";

import { useEffect, useState } from "react";
import RisksList, { type RiskRow } from "@/components/prototype/RisksList";

interface Props {
  slug: string;
}

export default function RisksClientTab({ slug }: Props) {
  const [risks, setRisks] = useState<RiskRow[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch("/api/data/risks", { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => {
        const raw = j.risks ?? j ?? [];
        const mapped: RiskRow[] = raw.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          label: String(r.label ?? ""),
          impact: Number(r.impact ?? 0),
          probability: Number(r.probability ?? 0),
          status: String(r.status ?? "actif"),
          mitigation: (r.mitigation as string | null) ?? null,
        }));
        setRisks(mapped);
      })
      .catch(() => setRisks([]));
  }, [slug]);

  if (risks === null) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  return <RisksList risks={risks} />;
}
