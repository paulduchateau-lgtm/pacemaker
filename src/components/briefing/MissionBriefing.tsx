"use client";

import { useEffect, useState } from "react";
import type { Briefing } from "@/lib/briefing";

type Level = "30s" | "2min" | "10min";

const LEVEL_LABELS: Record<Level, string> = {
  "30s": "30 SEC",
  "2min": "2 MIN",
  "10min": "10 MIN",
};

export default function MissionBriefing({ slug }: { slug: string }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("30s");
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(forceRefresh = false) {
    setError(null);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(
        `/api/briefing/${slug}${forceRefresh ? "?refresh=true" : ""}`,
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Impossible de générer le briefing");
      setBriefing(j.briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div
      className="p-4 mb-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            BRIEFING MISSION
          </h2>
          {briefing && (
            <div
              className="mono-label"
              style={{ color: "var(--color-muted)" }}
            >
              {briefing.meta.pendingIncoherences > 0 && (
                <span style={{ color: "var(--color-amber)" }}>
                  ⚠ {briefing.meta.pendingIncoherences} incohérence(s)
                </span>
              )}
              {briefing.meta.pendingIncoherences > 0 &&
                briefing.meta.blockedTasks > 0 && <span> · </span>}
              {briefing.meta.blockedTasks > 0 && (
                <span style={{ color: "var(--color-alert)" }}>
                  {briefing.meta.blockedTasks} bloquée(s)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(["30s", "2min", "10min"] as Level[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className="mono-label px-2 py-1"
              style={{
                color:
                  level === lv
                    ? "var(--color-ink)"
                    : "var(--color-muted)",
                backgroundColor:
                  level === lv ? "var(--color-green)" : "transparent",
                borderRadius: "6px",
                border: "1px solid var(--color-border)",
              }}
            >
              {LEVEL_LABELS[lv]}
            </button>
          ))}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="mono-label px-2 py-1"
            style={{
              color: "var(--color-muted)",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              marginLeft: "4px",
            }}
            title="Régénérer"
          >
            {refreshing ? "…" : "↻"}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="mono-label px-2 py-1"
            style={{
              color: "var(--color-muted)",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
            }}
          >
            {collapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div>
          {loading && (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Génération du briefing...
            </p>
          )}
          {error && (
            <p className="text-sm" style={{ color: "var(--color-alert)" }}>
              {error}
            </p>
          )}
          {briefing && (
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: "var(--color-ink)", lineHeight: 1.5 }}
            >
              {briefing.levels[level]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
