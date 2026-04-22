"use client";

import { useEffect, useState, useCallback } from "react";
import ImpactCard from "./ImpactCard";
import type { PlanImpact } from "@/types";

interface Props {
  slug: string;
}

interface IntakeGroup {
  intake_id: string | null;
  source_type?: string;
  ingested_at?: string;
  excerpt?: string;
  impacts: PlanImpact[];
}

function groupByIntake(impacts: PlanImpact[]): IntakeGroup[] {
  const map = new Map<string, IntakeGroup>();
  for (const impact of impacts) {
    const key = impact.intake_id ?? "__none__";
    if (!map.has(key)) {
      map.set(key, { intake_id: impact.intake_id ?? null, impacts: [] });
    }
    map.get(key)!.impacts.push(impact);
  }
  return Array.from(map.values());
}

export default function ArbitrageTab({ slug }: Props) {
  const [groups, setGroups] = useState<IntakeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/impacts?status=proposed,modified&mission=${slug}`,
      { headers: { "x-mission-slug": slug } },
    );
    if (!res.ok) { setLoading(false); return; }
    const data: PlanImpact[] = await res.json().catch(() => []);
    // Enrichir les groupes avec les metadonnees d'intake si possible
    const grouped = groupByIntake(data);
    const enriched = await Promise.all(
      grouped.map(async (g) => {
        if (!g.intake_id) return g;
        const r = await fetch(`/api/intakes/${g.intake_id}`, { headers: { "x-mission-slug": slug } }).catch(() => null);
        if (r?.ok) {
          const intake = await r.json().catch(() => null);
          if (intake) {
            return { ...g, source_type: intake.source_type, ingested_at: intake.ingested_at, excerpt: intake.raw_content_excerpt };
          }
        }
        return g;
      }),
    );
    setGroups(enriched);
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const removeImpact = (id: string) => {
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, impacts: g.impacts.filter((i) => i.id !== id) }))
        .filter((g) => g.impacts.length > 0),
    );
  };

  const acceptAll = async (intakeId: string | null) => {
    if (!intakeId) return;
    await fetch(`/api/impacts/accept-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mission-slug": slug },
      body: JSON.stringify({ intake_id: intakeId }),
    });
    setGroups((prev) => prev.filter((g) => g.intake_id !== intakeId));
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (groups.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)" }}>
        <span className="mono" style={{ fontSize: 12, letterSpacing: "0.12em" }}>◆ Aucun arbitrage en attente</span>
      </div>
    );
  }

  return (
    <div>
      {groups.map((g, i) => (
        <section key={g.intake_id ?? i} className="card" style={{ marginBottom: 16 }}>
          <div className="card-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {g.source_type ?? "source inconnue"}
            </span>
            {g.ingested_at && (
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>
                {new Date(g.ingested_at).toLocaleDateString("fr-FR")}
              </span>
            )}
            {g.excerpt && (
              <span style={{ fontSize: 12, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {g.excerpt.slice(0, 60)}
              </span>
            )}
            <button
              className="btn btn-sm"
              style={{ marginLeft: "auto", fontSize: 11 }}
              onClick={() => acceptAll(g.intake_id)}
            >
              Tout accepter ({g.impacts.length})
            </button>
          </div>
          <div className="card-body" style={{ padding: "8px 12px" }}>
            {g.impacts.map((impact) => (
              <ImpactCard
                key={impact.id}
                impact={impact}
                slug={slug}
                onAccepted={removeImpact}
                onRejected={removeImpact}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
