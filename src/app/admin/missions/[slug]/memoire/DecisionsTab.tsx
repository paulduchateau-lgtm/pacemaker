"use client";

import { useEffect, useState } from "react";
import DecisionNode, { type DecisionRow } from "@/components/prototype/DecisionNode";

interface Props {
  slug: string;
}

function parseJsonList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const p = JSON.parse(String(raw));
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

export default function DecisionsTab({ slug }: Props) {
  const [decisions, setDecisions] = useState<DecisionRow[] | null>(null);
  const [tabFilter, setTabFilter] = useState<"all" | "acted" | "proposed" | "contradicted">("all");

  useEffect(() => {
    if (!slug) return;
    fetch("/api/data/decisions", { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => {
        const rows = j.decisions ?? j ?? [];
        const mapped: DecisionRow[] = rows.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          date: String(r.acted_at ?? r.actedAt ?? "").slice(0, 10),
          author: String(r.author ?? "paul"),
          conf: r.confidence != null ? Number(r.confidence) : null,
          status: String(r.status),
          confNote: r.rationale_source === "llm_inferred" ? "extraite par LLM" : null,
          statement: String(r.statement),
          rationale: (r.rationale as string | null) ?? null,
          alternatives: parseJsonList(r.alternatives),
          impactsOn: [],
          source: null,
          contradicted: Boolean(r.contradicted),
        }));
        setDecisions(mapped);
      })
      .catch(() => setDecisions([]));
  }, [slug]);

  if (decisions === null) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  const filtered = decisions.filter((d) => {
    if (tabFilter === "acted") return d.status === "actee" || d.status === "actée";
    if (tabFilter === "proposed") return d.status === "proposee" || d.status === "proposée";
    if (tabFilter === "contradicted") return d.contradicted;
    return true;
  });

  const counts = {
    all: decisions.length,
    acted: decisions.filter((d) => d.status === "actee" || d.status === "actée").length,
    proposed: decisions.filter((d) => d.status === "proposee" || d.status === "proposée").length,
    contradicted: decisions.filter((d) => d.contradicted).length,
  };

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 20 }}>
        {(["all", "acted", "proposed", "contradicted"] as const).map((t) => {
          const labels = { all: "Toutes", acted: "Actees", proposed: "Proposees", contradicted: "Contredites" };
          return (
            <div key={t} className={"tab" + (tabFilter === t ? " active" : (t === "contradicted" ? " alert" : ""))} onClick={() => setTabFilter(t)}>
              {labels[t]}<span className="count">{counts[t]}</span>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucune decision dans ce filtre.
        </div>
      ) : (
        <div className="dec-timeline">
          {filtered.map((d, i) => (
            <DecisionNode key={d.id} d={d} first={i === 0} last={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
