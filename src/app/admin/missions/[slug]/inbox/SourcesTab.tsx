"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/prototype/Icon";
import DocSearch from "@/components/prototype/DocSearch";
import SourceRow from "@/components/prototype/sources/SourceRow";
import SourceDetail from "@/components/prototype/sources/SourceDetail";
import { KIND_META, mapDocToSource, type Source } from "@/components/prototype/sources/source-types";

interface Props {
  slug: string;
}

export default function SourcesTab({ slug }: Props) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/docs", { headers: { "x-mission-slug": slug } }).catch(() => null);
    if (!res || !res.ok) { setSources([]); return; }
    const json = await res.json().catch(() => []);
    const docs = (Array.isArray(json) ? json : json.documents ?? []) as Array<Record<string, unknown>>;
    const mapped: Source[] = docs.map(mapDocToSource);
    setSources(mapped);
    if (mapped.length > 0 && !openId) setOpenId(mapped[0].id);
  }, [slug, openId]);

  useEffect(() => { load(); }, [load]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sources?.length ?? 0 };
    for (const s of sources ?? []) counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    return counts;
  }, [sources]);

  const activeKinds = useMemo(
    () => Object.keys(kindCounts).filter((k) => k !== "all" && kindCounts[k] > 0),
    [kindCounts],
  );

  const filtered = useMemo(
    () => (sources ?? []).filter((s) => kindFilter === "all" || s.kind === kindFilter),
    [sources, kindFilter],
  );
  const open = sources?.find((s) => s.id === openId) ?? null;

  return (
    <div>
      <DocSearch slug={slug} />

      <div className="src-stats">
        <div className="src-stat">
          <div className="src-stat-icon"><Icon name="database" /></div>
          <div>
            <div className="src-stat-value">{sources?.length ?? "—"}</div>
            <div className="src-stat-label">sources indexees</div>
          </div>
        </div>
        <div className="src-stat tone-green">
          <div className="src-stat-icon"><Icon name="clock" /></div>
          <div>
            <div className="src-stat-value">
              {sources
                ? Math.round((sources.filter((s) => s.freshness === "live" || s.freshness === "fresh").length / Math.max(sources.length, 1)) * 100)
                : "—"}%
            </div>
            <div className="src-stat-label">fraicheur recente</div>
          </div>
        </div>
        <div className="src-stat tone-amber">
          <div className="src-stat-icon"><Icon name="incoh" /></div>
          <div>
            <div className="src-stat-value">{sources ? sources.filter((s) => s.freshness === "old").length : "—"}</div>
            <div className="src-stat-label">sources anciennes</div>
          </div>
        </div>
      </div>

      <div className="src-kinds">
        <button className={"src-kind" + (kindFilter === "all" ? " active" : "")} onClick={() => setKindFilter("all")}>
          <span>Toutes</span>
          <span className="src-kind-count">{kindCounts.all ?? 0}</span>
        </button>
        {activeKinds.map((k) => {
          const meta = KIND_META[k] ?? { label: k, icon: "file" };
          return (
            <button key={k} className={"src-kind" + (kindFilter === k ? " active" : "")} onClick={() => setKindFilter(k)}>
              <Icon name={meta.icon} />
              <span>{meta.label}</span>
              <span className="src-kind-count">{kindCounts[k] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {sources === null ? (
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      ) : sources.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucune source indexee pour cette mission.
        </div>
      ) : (
        <div className="src-layout">
          <div className="src-index">
            <div className="src-index-head">
              <span className="mono muted" style={{ fontSize: 10.5 }}>INDEX · {filtered.length}</span>
            </div>
            {filtered.map((s) => (
              <SourceRow key={s.id} s={s} active={s.id === openId} onClick={() => setOpenId(s.id)} />
            ))}
          </div>
          <div className="src-detail">
            {open ? (
              <SourceDetail s={open} />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                Selectionne une source pour voir sa trace.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
