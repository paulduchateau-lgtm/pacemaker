"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/prototype/Badge";

interface IncoherenceData {
  id: string;
  kind: string;
  severity: string;
  description: string;
  autoResolution: string | null;
  resolutionStatus: string;
  sourceEntityType: string;
  conflictingEntityType: string;
  createdAt: string;
}

interface Props {
  id: string;
  slug: string;
}

const SEV_TONE: Record<string, "" | "alert" | "amber"> = {
  major: "alert",
  moderate: "amber",
  minor: "",
};

export default function IncoherencePanel({ id, slug }: Props) {
  const [item, setItem] = useState<IncoherenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState(false);

  useEffect(() => {
    if (!id || !slug) return;
    fetch(`/api/data/incoherences/${id}`, { headers: { "x-mission-slug": slug } })
      .then((r) => r.json())
      .then((j) => {
        const i = j.incoherence ?? j;
        setItem({
          id: String(i.id),
          kind: String(i.kind ?? ""),
          severity: String(i.severity ?? "minor"),
          description: String(i.description ?? ""),
          autoResolution: (i.auto_resolution ?? i.autoResolution) as string | null,
          resolutionStatus: String(i.resolution_status ?? i.resolutionStatus ?? "pending"),
          sourceEntityType: String(i.source_entity_type ?? i.sourceEntityType ?? ""),
          conflictingEntityType: String(i.conflicting_entity_type ?? i.conflictingEntityType ?? ""),
          createdAt: String(i.created_at ?? i.createdAt ?? ""),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, slug]);

  const patch = async (resolution: string) => {
    if (!item) return;
    setPatching(true);
    const res = await fetch(`/api/data/incoherences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-mission-slug": slug },
      body: JSON.stringify({ resolution_status: resolution }),
    }).catch(() => null);
    if (res?.ok) {
      setItem((prev) => prev ? { ...prev, resolutionStatus: resolution } : null);
    }
    setPatching(false);
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Chargement...</p>;
  if (!item) return <p style={{ color: "var(--muted)" }}>Incoherence introuvable.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6, letterSpacing: "0.1em" }}>
          {item.kind.toUpperCase()} · {item.createdAt.slice(0, 10)}
        </div>
        <div style={{ fontSize: 16, color: "var(--ink)", lineHeight: 1.4 }}>{item.description}</div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Badge tone={SEV_TONE[item.severity] ?? ""}>{item.severity}</Badge>
        <Badge>{item.resolutionStatus}</Badge>
      </div>

      {item.autoResolution && (
        <div style={{ padding: "12px 14px", background: "var(--paper-sunk)", border: "1px solid var(--border-soft)", borderRadius: 4 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 6 }}>RESOLUTION AUTOMATIQUE</div>
          <div style={{ fontSize: 13 }}>{item.autoResolution}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>SOURCE</div>
          <div style={{ fontSize: 12 }}>{item.sourceEntityType}</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>CONFLICTE AVEC</div>
          <div style={{ fontSize: 12 }}>{item.conflictingEntityType}</div>
        </div>
      </div>

      {item.resolutionStatus === "pending" && (
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => patch("user_acknowledged")}
            disabled={patching}
          >
            Accepter
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => patch("user_rejected")}
            disabled={patching}
          >
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}
