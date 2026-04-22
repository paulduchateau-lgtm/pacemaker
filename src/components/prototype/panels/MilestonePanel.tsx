"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";

interface MilestoneData {
  id: string;
  phase_id: string;
  label: string;
  target_date: string | null;
  status: string;
}

interface CriterionRow {
  id: string;
  label: string;
  criterion_type: string;
  status: string;
  evaluation_value: string | null;
}

interface Props {
  id: string;
  slug: string;
}

const TONE: Record<string, "" | "green" | "amber" | "soft"> = {
  met: "green",
  not_met: "amber",
  pending: "soft",
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MilestonePanel({ id, slug }: Props) {
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !slug) return;
    (async () => {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/data/milestones/${id}`, { headers: { "x-mission-slug": slug } }),
        fetch(`/api/data/success-criteria?milestone_id=${id}`, { headers: { "x-mission-slug": slug } }),
      ]);
      const mj = await mRes.json().catch(() => ({}));
      const cj = await cRes.json().catch(() => []);
      setMilestone(mj.milestone ?? mj);
      setCriteria(cj.criteria ?? cj ?? []);
      setLoading(false);
    })();
  }, [id, slug]);

  const patchCriterion = async (critId: string, status: string) => {
    setCriteria((prev) => prev.map((c) => c.id === critId ? { ...c, status } : c));
    await fetch(`/api/data/success-criteria/${critId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-mission-slug": slug },
      body: JSON.stringify({ status }),
    }).catch(() => null);
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (!milestone) return <p style={{ color: "var(--muted)" }}>Jalon introuvable.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.1em" }}>JALON</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{milestone.label}</div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Badge tone={TONE[milestone.status] ?? ""}>{milestone.status}</Badge>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
          Cible : {shortDate(milestone.target_date)}
        </span>
      </div>

      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 8, letterSpacing: "0.1em" }}>
          CRITERES DE SUCCES ({criteria.length})
        </div>
        {criteria.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Aucun critere defini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {criteria.map((c) => (
              <div key={c.id} className="row" style={{ gap: 10, padding: "8px 12px", background: "var(--paper-sunk)", border: "1px solid var(--border-soft)", borderRadius: 4 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{c.label}</span>
                <Badge tone={TONE[c.status] ?? ""}>{c.status}</Badge>
                <div className="row" style={{ gap: 4 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: "2px 6px", color: "var(--green-deep)" }}
                    onClick={() => patchCriterion(c.id, "met")}
                    disabled={c.status === "met"}
                  >
                    OK
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: "2px 6px", color: "var(--muted)" }}
                    onClick={() => patchCriterion(c.id, "not_met")}
                    disabled={c.status === "not_met"}
                  >
                    KO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
