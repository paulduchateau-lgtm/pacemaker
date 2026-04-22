"use client";

import { useEffect, useState } from "react";
import type { AgentAction } from "@/lib/agent-actions";
import { isReversible } from "@/lib/agent-actions";

const TYPE_ICON: Record<AgentAction["actionType"], string> = {
  create_task: "+",
  update_task: "✎",
  update_deliverable: "◆",
  add_context: "i",
  create_decision: "★",
  flag_incoherence: "⚠",
  recalibrate_plan: "⟳",
  ask_user: "?",
  noop: "·",
};

const TYPE_COLOR: Record<AgentAction["actionType"], string> = {
  create_task: "var(--green-deep)",
  update_task: "var(--muted)",
  update_deliverable: "var(--muted)",
  add_context: "var(--muted)",
  create_decision: "var(--green-deep)",
  flag_incoherence: "var(--amber)",
  recalibrate_plan: "var(--amber)",
  ask_user: "var(--muted)",
  noop: "var(--muted)",
};

export default function JournalAgentList({ slug }: { slug: string }) {
  const [actions, setActions] = useState<AgentAction[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/agent-actions?limit=200", { headers: { "x-mission-slug": slug } });
    const j = await res.json();
    setActions(j.actions ?? []);
  }

  async function revert(id: string) {
    if (busy) return;
    if (!confirm("Annuler cette action ? Les modifications seront défaites.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/agent-actions/${id}/revert`, { method: "POST", headers: { "x-mission-slug": slug } });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Revert échoué");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (actions === null) return <p className="mono" style={{ color: "var(--muted)" }}>Chargement…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && (
        <div className="mono" style={{ color: "var(--alert)", background: "#FDECEA", padding: "6px 10px", borderRadius: 6 }}>
          {error}
        </div>
      )}
      {actions.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
          Aucune action enregistrée.
        </div>
      )}
      {actions.map((a) => {
        const reversible = !a.revertedAt && isReversible(a.actionType);
        return (
          <div
            key={a.id}
            className="card"
            style={{ padding: 12, display: "flex", alignItems: "flex-start", gap: 10, opacity: a.revertedAt ? 0.5 : 1 }}
          >
            <span className="mono" style={{ color: TYPE_COLOR[a.actionType], width: 20, textAlign: "center", flexShrink: 0, fontSize: 14 }}>
              {TYPE_ICON[a.actionType]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, color: "var(--ink)" }}>{a.narrative}</p>
              {a.reasoning && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{a.reasoning}</p>
              )}
              <div className="mono" style={{ color: "var(--muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span>{a.createdAt.slice(0, 16)}</span>
                <span>·</span>
                <span>{a.actionType}</span>
                {a.confidence !== null && (
                  <>
                    <span>·</span>
                    <span>CONF {Math.round(a.confidence * 100)}%</span>
                  </>
                )}
                {a.revertedAt && (
                  <>
                    <span>·</span>
                    <span>REVERTÉ {a.revertedAt.slice(0, 16)}</span>
                  </>
                )}
              </div>
            </div>
            {reversible && (
              <button
                onClick={() => revert(a.id)}
                disabled={busy === a.id}
                className="mono"
                style={{
                  color: "var(--alert)",
                  border: "1px solid var(--alert)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  opacity: busy === a.id ? 0.5 : 1,
                  background: "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {busy === a.id ? "…" : "ANNULER"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
