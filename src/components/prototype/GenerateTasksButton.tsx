"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";

export default function GenerateTasksButton({
  weekId,
  slug,
  label = "Générer les tâches",
}: {
  weekId: number;
  slug: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/llm/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({ weekId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ gap: 8, alignItems: "center" }}>
      {err && <span className="mono" style={{ color: "var(--alert)" }}>{err}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="btn btn-ghost"
        style={{ fontSize: 11.5, padding: "4px 10px", opacity: busy ? 0.5 : 1 }}
        title="Générer 4-6 tâches pour cette semaine via LLM + RAG"
      >
        <Icon name="sparkle" />
        {busy ? "Génération… (10-20s)" : label}
      </button>
    </div>
  );
}
