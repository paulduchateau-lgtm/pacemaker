"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Incoherence } from "@/lib/incoherences";
import IncoherenceCard from "@/components/incoherences/IncoherenceCard";

export default function IncoherencesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [items, setItems] = useState<Incoherence[] | null>(null);

  async function load() {
    const res = await fetch("/api/incoherences?brief=true", {
      headers: { "x-mission-slug": slug },
    });
    const json = await res.json();
    setItems(json.incoherences ?? []);
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const pending = (items ?? []).filter(
    (i) => i.resolutionStatus === "pending",
  );
  const others = (items ?? []).filter(
    (i) => i.resolutionStatus !== "pending",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Incohérences
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          Pacemaker compare chaque nouvel input à l&apos;état de la mission et
          signale les contradictions. Le silence n&apos;est jamais l&apos;option
          par défaut.
        </p>
      </div>

      {items === null && (
        <p style={{ color: "var(--color-muted)" }}>Chargement...</p>
      )}

      {items !== null && items.length === 0 && (
        <div
          className="p-6 text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-muted)",
          }}
        >
          Aucune incohérence détectée jusqu&apos;à présent.
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="mono-label" style={{ color: "var(--color-amber)" }}>
            À TRANCHER ({pending.length})
          </h2>
          {pending.map((i) => (
            <IncoherenceCard
              key={i.id}
              incoherence={i}
              onStatusChange={load}
            />
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
            HISTORIQUE ({others.length})
          </h2>
          {others.map((i) => (
            <IncoherenceCard
              key={i.id}
              incoherence={i}
              onStatusChange={load}
            />
          ))}
        </section>
      )}
    </div>
  );
}
