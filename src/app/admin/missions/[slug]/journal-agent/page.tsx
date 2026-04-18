"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  create_task: "var(--color-green)",
  update_task: "var(--color-muted)",
  update_deliverable: "var(--color-muted)",
  add_context: "var(--color-muted)",
  create_decision: "var(--color-green)",
  flag_incoherence: "var(--color-amber)",
  recalibrate_plan: "var(--color-amber)",
  ask_user: "var(--color-muted)",
  noop: "var(--color-muted)",
};

export default function JournalAgentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [actions, setActions] = useState<AgentAction[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/agent-actions?limit=200", {
      headers: { "x-mission-slug": slug },
    });
    const j = await res.json();
    setActions(j.actions ?? []);
  }

  async function revert(id: string) {
    if (busy) return;
    if (!confirm("Annuler cette action ? Les modifications seront défaites.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/agent-actions/${id}/revert`, {
        method: "POST",
        headers: { "x-mission-slug": slug },
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Journal agent
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          Toutes les actions prises par Pacemaker sur cette mission. Les
          actions mécaniques peuvent être annulées ; les décisions et
          incohérences se gèrent depuis leurs pages dédiées.
        </p>
      </div>

      {error && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            color: "var(--color-alert)",
            backgroundColor: "#FDECEA",
            borderRadius: "6px",
          }}
        >
          {error}
        </div>
      )}

      {actions === null && (
        <p style={{ color: "var(--color-muted)" }}>Chargement...</p>
      )}

      {actions !== null && actions.length === 0 && (
        <div
          className="p-6 text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            color: "var(--color-muted)",
          }}
        >
          Aucune action enregistrée.
        </div>
      )}

      <div className="space-y-2">
        {(actions ?? []).map((a) => {
          const reversible = !a.revertedAt && isReversible(a.actionType);
          return (
            <div
              key={a.id}
              className="p-3 flex items-start gap-3"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                opacity: a.revertedAt ? 0.5 : 1,
              }}
            >
              <span
                className="mono-label shrink-0 w-6 text-center"
                style={{ color: TYPE_COLOR[a.actionType] }}
                aria-hidden
              >
                {TYPE_ICON[a.actionType]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                  {a.narrative}
                </p>
                {a.reasoning && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {a.reasoning}
                  </p>
                )}
                <div
                  className="mono-label mt-1 flex flex-wrap gap-2"
                  style={{ color: "var(--color-muted)" }}
                >
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
                  className="mono-label px-2 py-1 shrink-0"
                  style={{
                    color: "var(--color-alert)",
                    border: "1px solid var(--color-alert)",
                    borderRadius: "6px",
                    opacity: busy === a.id ? 0.5 : 1,
                  }}
                >
                  {busy === a.id ? "..." : "ANNULER"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
