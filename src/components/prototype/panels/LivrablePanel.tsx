"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";
import type { LivrableRow } from "@/components/prototype/LivrableCard";

interface Props {
  id: string;
  slug: string;
}

export default function LivrablePanel({ id, slug }: Props) {
  const [livrable, setLivrable] = useState<LivrableRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !slug) return;
    fetch(`/api/data/livrables/${id}`, { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => {
        const l = j.livrable ?? j;
        setLivrable({
          id: String(l.id),
          label: String(l.label ?? l.titre ?? "Livrable"),
          fmt: String(l.fmt ?? l.format ?? "DOC").toUpperCase(),
          week: l.weekId != null ? Number(l.weekId) : l.week_id != null ? Number(l.week_id) : null,
          status: String(l.status ?? "planifie"),
          delivered: (l.deliveryDate as string | null) ?? (l.delivered as string | null) ?? null,
          sourceTaskId: (l.sourceTaskId as string | null) ?? null,
          sourceTaskLabel: (l.sourceTaskLabel as string | null) ?? null,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, slug]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (!livrable) return <p style={{ color: "var(--muted)" }}>Livrable introuvable.</p>;

  const tone: "" | "green" | "amber" | "soft" =
    livrable.status === "valide" ? "green"
    : livrable.status === "en cours" ? "amber"
    : livrable.status === "planifie" ? "soft"
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.1em" }}>
          {livrable.fmt} · S{livrable.week ?? "?"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{livrable.label}</div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Badge tone={tone}>{livrable.status}</Badge>
        {livrable.delivered && (
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            livre le {livrable.delivered.slice(0, 10)}
          </span>
        )}
      </div>

      {livrable.sourceTaskLabel && (
        <div style={{ padding: "10px 12px", background: "var(--paper-sunk)", border: "1px solid var(--border-soft)", borderRadius: 4 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>ISSU DE LA TACHE</div>
          <div style={{ fontSize: 13 }}>{livrable.sourceTaskLabel}</div>
        </div>
      )}

      <div>
        <a
          href={`/admin/missions/${slug}/plan?tab=livrables`}
          className="btn btn-ghost"
          style={{ display: "inline-block" }}
        >
          Voir dans Plan
        </a>
      </div>
    </div>
  );
}
