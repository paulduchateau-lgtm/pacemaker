"use client";

import { useState } from "react";
import type { PlanImpact } from "@/types";

interface Props {
  impact: PlanImpact;
  slug: string;
  onAccepted: (id: string) => void;
  onRejected: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: "var(--muted)",
  moderate: "var(--ink)",
  major: "#D95B2F",
};

const CHANGE_LABELS: Record<string, string> = {
  add: "Ajout",
  modify: "Modification",
  remove: "Suppression",
  reorder: "Reordonnancement",
  reclassify: "Reclassification",
  link: "Liaison",
  unlink: "Deliaison",
};

const TARGET_LABELS: Record<string, string> = {
  task: "Tache",
  risk: "Risque",
  livrable: "Livrable",
  iteration: "Iteration",
  phase: "Phase",
  milestone: "Jalon",
  success_criterion: "Critere",
  decision: "Decision",
  week: "Semaine",
  context_item: "Contexte",
};

function DiffPreview({ before, after, changeType }: { before: string | null; after: string | null; changeType: string }) {
  if (changeType === "add" && after) {
    const obj = JSON.parse(after) as Record<string, unknown>;
    return (
      <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(165,217,0,0.08)", fontSize: 12, fontFamily: "var(--font-mono, monospace)", color: "var(--ink)" }}>
        {Object.entries(obj).slice(0, 3).map(([k, v]) => (
          <div key={k} style={{ color: "#3a7a00" }}>+ {k}: {String(v ?? "")}</div>
        ))}
      </div>
    );
  }
  if (changeType === "remove" && before) {
    const obj = JSON.parse(before) as Record<string, unknown>;
    return (
      <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(217,91,47,0.08)", fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>
        {Object.entries(obj).slice(0, 3).map(([k, v]) => (
          <div key={k} style={{ color: "#a33000", textDecoration: "line-through" }}>- {k}: {String(v ?? "")}</div>
        ))}
      </div>
    );
  }
  if (changeType === "modify") {
    return (
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        {before && <div style={{ flex: 1, padding: "4px 8px", background: "rgba(217,91,47,0.07)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "#a33000" }}>{before.slice(0, 80)}</div>}
        {after && <div style={{ flex: 1, padding: "4px 8px", background: "rgba(165,217,0,0.07)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "#3a7a00" }}>{after.slice(0, 80)}</div>}
      </div>
    );
  }
  return null;
}

export default function ImpactCard({ impact, slug, onAccepted, onRejected }: Props) {
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/impacts/${impact.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Echec");
      onAccepted(impact.id);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const reject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/impacts/${impact.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Echec");
      onRejected(impact.id);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const conf = impact.confidence != null ? Math.round(impact.confidence * 100) : null;

  return (
    <div className="card" style={{ marginBottom: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: SEVERITY_COLORS[impact.severity], letterSpacing: "0.12em", textTransform: "uppercase" }}>{impact.severity}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em" }}>{TARGET_LABELS[impact.target_type] ?? impact.target_type} · {CHANGE_LABELS[impact.change_type] ?? impact.change_type}</span>
        {conf != null && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 60, height: 4, background: "var(--border)", borderRadius: 2 }}>
              <div style={{ width: `${conf}%`, height: "100%", background: conf >= 80 ? "var(--green)" : conf >= 60 ? "var(--muted)" : "#D95B2F", borderRadius: 2 }} />
            </div>
            <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{conf}%</span>
          </div>
        )}
      </div>
      {impact.rationale && <p style={{ fontSize: 13, color: "var(--ink)", margin: "0 0 6px" }}>{impact.rationale}</p>}
      <DiffPreview before={impact.diff_before ?? null} after={impact.diff_after ?? null} changeType={impact.change_type} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="btn btn-sm" onClick={accept} disabled={loading} style={{ flex: 1 }}>Accepter</button>
        <button className="btn btn-sm btn-ghost" onClick={reject} disabled={loading} style={{ flex: 1 }}>Rejeter</button>
      </div>
    </div>
  );
}
