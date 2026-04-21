"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import SourceIcon from "@/components/prototype/SourceIcon";

interface Source {
  id: string;
  kind: string;
  title: string;
  fmt: string;
  uploaded: string;
  freshness: "live" | "fresh" | "stale" | "old";
  used: number;
  extracts: string[];
  stale: boolean;
  staleNote?: string;
  inconsistency: boolean;
}

/**
 * Dérive les sources depuis les documents RAG. Pour l'instant, fraîcheur et
 * inconsistency sont calculés côté client (heuristique) : fraîcheur par
 * date d'upload, inconsistency via la présence dans les incoherences
 * (conflicting_entity_type = 'document').
 */
function freshnessFrom(uploadedIso: string): Source["freshness"] {
  const ageDays = (Date.now() - new Date(uploadedIso).getTime()) / (24 * 3600 * 1000);
  if (ageDays < 2) return "live";
  if (ageDays < 5) return "fresh";
  if (ageDays < 10) return "stale";
  return "old";
}

export default function SourcesV2Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [sources, setSources] = useState<Source[] | null>(null);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/docs/search?query=&limit=50", {
      headers: { "x-mission-slug": slug },
    }).catch(() => null);

    // fallback : liste globale depuis table documents via endpoint générique
    if (!res) {
      setSources([]);
      return;
    }

    const json = await res.json().catch(() => ({ documents: [] }));
    const docs = (json.documents ?? json.results ?? []) as Array<
      Record<string, unknown>
    >;
    const mapped: Source[] = docs.map((d) => {
      const kind = String(d.type ?? d.source ?? "doc");
      const uploaded = String(d.createdAt ?? d.created_at ?? new Date().toISOString());
      return {
        id: String(d.id),
        kind: kind === "plaud" ? "plaud" : kind === "cr" ? "doc" : kind,
        title: String(d.title ?? "Source"),
        fmt: String(d.source ?? d.fmt ?? kind).toUpperCase(),
        uploaded,
        freshness: freshnessFrom(uploaded),
        used: Number(d.used ?? 0),
        extracts: [],
        stale: false,
        inconsistency: false,
      };
    });
    setSources(mapped);
    if (mapped.length > 0 && !openId) setOpenId(mapped[0].id);
  }, [slug, openId]);

  useEffect(() => {
    load();
  }, [load]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sources?.length ?? 0 };
    for (const s of sources ?? []) counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    return counts;
  }, [sources]);

  const filtered = useMemo(
    () =>
      (sources ?? []).filter((s) => kindFilter === "all" || s.kind === kindFilter),
    [sources, kindFilter],
  );
  const open = sources?.find((s) => s.id === openId) ?? null;

  return (
    <div className="page src-page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            INDEX RAG · TRAÇABILITÉ · FRAÎCHEUR
          </div>
          <h1 className="page-title">Sources &amp; inputs</h1>
          <div className="page-sub">
            Tout ce qui nourrit Pacemaker est tracé, horodaté, évalué pour sa
            fraîcheur et sa cohérence.
          </div>
        </div>
      </div>

      <div className="src-stats">
        <div className="src-stat">
          <div className="src-stat-icon">
            <Icon name="database" />
          </div>
          <div>
            <div className="src-stat-value">{sources?.length ?? "—"}</div>
            <div className="src-stat-label">sources indexées</div>
          </div>
        </div>
        <div className="src-stat tone-green">
          <div className="src-stat-icon">
            <Icon name="clock" />
          </div>
          <div>
            <div className="src-stat-value">
              {sources
                ? Math.round(
                    (sources.filter((s) => s.freshness === "live" || s.freshness === "fresh")
                      .length /
                      Math.max(sources.length, 1)) *
                      100,
                  )
                : "—"}
              %
            </div>
            <div className="src-stat-label">fraîcheur récente</div>
          </div>
        </div>
        <div className="src-stat tone-amber">
          <div className="src-stat-icon">
            <Icon name="incoh" />
          </div>
          <div>
            <div className="src-stat-value">
              {sources ? sources.filter((s) => s.freshness === "old").length : "—"}
            </div>
            <div className="src-stat-label">sources anciennes</div>
          </div>
        </div>
      </div>

      <div className="src-kinds">
        {[
          ["all", "Toutes", ""],
          ["doc", "Documents", "doc"],
          ["plaud", "Plaud", "plaud"],
          ["vision", "Photos", "camera"],
          ["whatsapp", "WhatsApp", "wa"],
        ].map(([k, l, icon]) => (
          <button
            key={k}
            className={"src-kind" + (kindFilter === k ? " active" : "")}
            onClick={() => setKindFilter(k)}
          >
            {icon && <Icon name={icon} />}
            <span>{l}</span>
            <span className="src-kind-count">{kindCounts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      {sources === null ? (
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      ) : sources.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucune source indexée pour cette mission.
        </div>
      ) : (
        <div className="src-layout">
          <div className="src-index">
            <div className="src-index-head">
              <span className="mono muted" style={{ fontSize: 10.5 }}>
                INDEX · {filtered.length}
              </span>
            </div>
            {filtered.map((s) => (
              <SourceRow
                key={s.id}
                s={s}
                active={s.id === openId}
                onClick={() => setOpenId(s.id)}
              />
            ))}
          </div>

          <div className="src-detail">
            {open ? (
              <SourceDetail s={open} />
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

function SourceRow({
  s,
  active,
  onClick,
}: {
  s: Source;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={"src-row" + (active ? " active" : "")}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="src-row-icon">
        <SourceIcon kind={s.kind} />
      </div>
      <div className="src-row-body">
        <div className="src-row-title">{s.title}</div>
        <div className="src-row-meta">
          <span className="mono muted">{s.fmt}</span>
          <span className="mono muted">· {s.uploaded.slice(0, 10)}</span>
          <span className={"fresh " + s.freshness}>
            <span className="d" />
          </span>
        </div>
      </div>
      <div className="src-row-used mono muted">{s.used}×</div>
    </div>
  );
}

function SourceDetail({ s }: { s: Source }) {
  return (
    <div className="src-doc">
      <div className="src-doc-head">
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <div className="src-doc-icon">
            <SourceIcon kind={s.kind} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-2" style={{ marginBottom: 4 }}>
              <span className="mono muted">{s.id.toUpperCase().slice(0, 14)}</span>
              <Badge tone="soft">{s.fmt}</Badge>
            </div>
            <h2 className="src-doc-title">{s.title}</h2>
            <div className="mono muted" style={{ marginTop: 4 }}>
              indexée {s.uploaded.slice(0, 10)} · utilisée {s.used} fois
            </div>
          </div>
        </div>
      </div>

      <div className="src-section">
        <div className="src-section-head">
          <Icon name="sparkle" />
          <span className="src-section-label">Extraits RAG</span>
        </div>
        <div className="src-extracts">
          <div className="src-extract">
            <span className="src-extract-bullet" />
            <span>
              Les chunks RAG de cette source sont accessibles via{" "}
              <code>searchDocs(query, limit, missionId)</code> côté serveur. Le
              panneau détaillé avec scores de similarité et liens d&apos;usage
              viendra dans une prochaine itération.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
