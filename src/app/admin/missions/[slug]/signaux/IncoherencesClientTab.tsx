"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";
import type { PanelContent } from "@/hooks/useSidePanel";

interface IncoherenceItem {
  id: string;
  kind: string;
  severity: string;
  description: string;
  autoResolution: string | null;
  resolutionStatus: string;
  sourceEntityType: string;
}

interface Props {
  slug: string;
  onOpenPanel?: (content: PanelContent) => void;
}

const SEVERITY_TONE: Record<string, "" | "alert" | "amber"> = {
  major: "alert",
  moderate: "amber",
  minor: "",
};

export default function IncoherencesClientTab({ slug, onOpenPanel }: Props) {
  const [items, setItems] = useState<IncoherenceItem[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!slug) return;
    fetch("/api/data/incoherences", { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => setItems(j.incoherences ?? j ?? []))
      .catch(() => setItems([]));
  }, [slug]);

  if (items === null) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;

  const filtered = filter === "pending"
    ? items.filter((i) => i.resolutionStatus === "pending")
    : items;

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 12 }}>
        <div className={"tab" + (filter === "pending" ? " active" : "")} onClick={() => setFilter("pending")}>
          A arbitrer<span className="count">{items.filter((i) => i.resolutionStatus === "pending").length}</span>
        </div>
        <div className={"tab" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
          Toutes<span className="count">{items.length}</span>
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
              Aucune incohérence dans ce filtre.
            </div>
          )}
          {filtered.map((item, i) => {
            const tone = SEVERITY_TONE[item.severity] ?? "";
            return (
              <div
                key={item.id}
                className="row"
                style={{
                  padding: "12px 16px",
                  borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border-soft)",
                  gap: 12,
                  cursor: onOpenPanel ? "pointer" : "default",
                }}
                onClick={() => onOpenPanel?.({ type: "incoherence", id: item.id })}
              >
                <span className={"arb-dot tone-" + tone} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 4 }}>{item.description}</div>
                  {item.autoResolution && (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.autoResolution}</div>
                  )}
                  <div className="row" style={{ gap: 8, marginTop: 4 }}>
                    <Badge tone={tone}>{item.severity}</Badge>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>{item.kind}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>source: {item.sourceEntityType}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
