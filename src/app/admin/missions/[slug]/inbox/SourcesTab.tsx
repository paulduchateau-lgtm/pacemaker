"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/prototype/Icon";
import DocSearch from "@/components/prototype/DocSearch";
import SourceRow from "@/components/prototype/sources/SourceRow";
import SourceDetail from "@/components/prototype/sources/SourceDetail";
import { KIND_META, mapDocToSource, type Source } from "@/components/prototype/sources/source-types";

interface Props { slug: string }

export default function SourcesTab({ slug }: Props) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [showObsolete, setShowObsolete] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/docs", { headers: { "x-mission-slug": slug } }).catch(() => null);
    if (!res?.ok) { setSources([]); return; }
    const json = await res.json().catch(() => []);
    const docs = (Array.isArray(json) ? json : json.documents ?? []) as Array<Record<string, unknown>>;
    setSources(docs.map(mapDocToSource));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const handleToggleObsolete = useCallback(async (id: string, current: "active" | "obsolete") => {
    const next = current === "obsolete" ? "active" : "obsolete";
    await fetch(`/api/docs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-mission-slug": slug },
      body: JSON.stringify({ status: next }),
    });
    setSources(prev => prev?.map(s => s.id === id ? { ...s, status: next } : s) ?? null);
  }, [slug]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/docs/${id}`, { method: "DELETE", headers: { "x-mission-slug": slug } });
    setSources(prev => prev?.filter(s => s.id !== id) ?? null);
    setOpenId(prev => prev === id ? null : prev);
  }, [slug]);

  const kindCounts = useMemo(() => {
    const base = (sources ?? []).filter(s => showObsolete || s.status === "active");
    const counts: Record<string, number> = { all: base.length };
    for (const s of base) counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    return counts;
  }, [sources, showObsolete]);

  const activeKinds = useMemo(
    () => Object.keys(kindCounts).filter(k => k !== "all" && kindCounts[k] > 0),
    [kindCounts],
  );

  const filtered = useMemo(() => {
    const base = (sources ?? []).filter(s => showObsolete || s.status === "active");
    return kindFilter === "all" ? base : base.filter(s => s.kind === kindFilter);
  }, [sources, kindFilter, showObsolete]);

  const open = sources?.find(s => s.id === openId) ?? null;
  const obsoleteCount = useMemo(() => (sources ?? []).filter(s => s.status === "obsolete").length, [sources]);

  return (
    <div>
      <DocSearch slug={slug} />
      <div className="src-stats">
        <div className="src-stat">
          <div className="src-stat-icon"><Icon name="database" /></div>
          <div>
            <div className="src-stat-value">{(sources ?? []).filter(s => s.status === "active").length}</div>
            <div className="src-stat-label">sources actives</div>
          </div>
        </div>
        <div className="src-stat tone-green">
          <div className="src-stat-icon"><Icon name="clock" /></div>
          <div>
            <div className="src-stat-value">
              {sources
                ? Math.round((sources.filter(s => s.status === "active" && (s.freshness === "live" || s.freshness === "fresh")).length / Math.max(sources.filter(s => s.status === "active").length, 1)) * 100)
                : "—"}%
            </div>
            <div className="src-stat-label">fraicheur récente</div>
          </div>
        </div>
        <div className="src-stat tone-amber" style={{ cursor: "pointer" }} onClick={() => setShowObsolete(v => !v)}>
          <div className="src-stat-icon"><Icon name="incoh" /></div>
          <div>
            <div className="src-stat-value">{obsoleteCount}</div>
            <div className="src-stat-label">{showObsolete ? "obsolètes (visibles)" : "obsolètes"}</div>
          </div>
        </div>
      </div>
      <div className="src-kinds">
        <button className={"src-kind" + (kindFilter === "all" ? " active" : "")} onClick={() => setKindFilter("all")}>
          <span>Toutes</span><span className="src-kind-count">{kindCounts.all ?? 0}</span>
        </button>
        {activeKinds.map(k => {
          const meta = KIND_META[k] ?? { label: k, icon: "file" };
          return (
            <button key={k} className={"src-kind" + (kindFilter === k ? " active" : "")} onClick={() => setKindFilter(k)}>
              <Icon name={meta.icon} /><span>{meta.label}</span><span className="src-kind-count">{kindCounts[k] ?? 0}</span>
            </button>
          );
        })}
      </div>
      {sources === null ? (
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucune source pour cette mission.
        </div>
      ) : (
        <div className="src-layout">
          <div className="src-index">
            <div className="src-index-head">
              <span className="mono muted" style={{ fontSize: 10.5 }}>INDEX · {filtered.length}</span>
            </div>
            {filtered.map(s => (
              <SourceRow key={s.id} s={s} active={s.id === openId} onClick={() => setOpenId(s.id)} />
            ))}
          </div>
          <div className="src-detail">
            {open ? (
              <SourceDetail s={open} onToggleObsolete={handleToggleObsolete} onDelete={handleDelete} />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                Sélectionne une source pour voir sa trace.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
