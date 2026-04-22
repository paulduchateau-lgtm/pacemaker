"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import LivrableCard, { type LivrableRow } from "@/components/prototype/LivrableCard";
import GenerateFromTaskModal from "@/components/prototype/livrables/GenerateFromTaskModal";

export default function LivrablesV2Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [items, setItems] = useState<LivrableRow[] | null>(null);
  const [tab, setTab] = useState<"all" | "drafts" | "review" | "sent" | "planned">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    const [lRes, tRes] = await Promise.all([
      fetch("/api/data/livrables", { headers: { "x-mission-slug": slug } }),
      fetch("/api/data/tasks", { headers: { "x-mission-slug": slug } }),
    ]);
    const [livrablesJson, tasksJson] = await Promise.all([lRes.json(), tRes.json()]);
    const tasks = Array.isArray(tasksJson) ? tasksJson : tasksJson.tasks ?? [];
    const taskLabelById: Record<string, string> = {};
    for (const t of tasks) taskLabelById[String(t.id)] = String(t.label ?? "");
    const raw: LivrableRow[] = (livrablesJson.livrables ?? livrablesJson ?? []).map(
      (l: Record<string, unknown>) => {
        const sourceTaskId = (l.sourceTaskId as string | null) ?? null;
        return {
          id: String(l.id),
          label: String(l.label ?? l.titre ?? "Livrable"),
          fmt: String(l.fmt ?? l.format ?? "").toUpperCase() || "DOC",
          week: l.weekId != null ? Number(l.weekId) : l.week_id != null ? Number(l.week_id) : null,
          status: String(l.status ?? "planifié"),
          delivered: (l.deliveryDate as string | null) ?? (l.delivered as string | null) ?? null,
          sourceTaskId,
          sourceTaskLabel: sourceTaskId ? (taskLabelById[sourceTaskId] ?? null) : null,
        };
      },
    );
    setItems(raw);
    if (raw.length > 0 && !openId) setOpenId(raw[0].id);
  }, [slug, openId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((l) => {
      if (tab === "drafts") return l.status === "en cours";
      if (tab === "review") return l.status === "livré";
      if (tab === "sent") return l.status === "validé";
      if (tab === "planned") return l.status === "planifié";
      return true;
    });
  }, [items, tab]);

  const open = useMemo(() => items?.find((l) => l.id === openId) ?? null, [items, openId]);

  const count = (pred: (l: LivrableRow) => boolean) =>
    items ? items.filter(pred).length : 0;

  return (
    <div className="page liv-page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            GÉNÉRATION ASSISTÉE · HUMAIN EN BOUCLE
          </div>
          <h1 className="page-title">Livrables</h1>
          <div className="page-sub">
            Pré-structurés par Pacemaker, finalisés par toi. Chaque item remonte
            son statut, sa semaine cible, son format.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Icon name="sparkle" /> Générer depuis une tâche
        </button>
      </div>
      {modalOpen && (
        <GenerateFromTaskModal slug={slug} onClose={() => setModalOpen(false)} onGenerated={load} />
      )}

      <div className="tabs">
        <div
          className={"tab" + (tab === "all" ? " active" : "")}
          onClick={() => setTab("all")}
        >
          Tous<span className="count">{items?.length ?? "—"}</span>
        </div>
        <div
          className={"tab" + (tab === "drafts" ? " active" : "")}
          onClick={() => setTab("drafts")}
        >
          En cours<span className="count">{count((l) => l.status === "en cours")}</span>
        </div>
        <div
          className={"tab" + (tab === "review" ? " active" : "")}
          onClick={() => setTab("review")}
        >
          Livrés<span className="count">{count((l) => l.status === "livré")}</span>
        </div>
        <div
          className={"tab" + (tab === "sent" ? " active" : "")}
          onClick={() => setTab("sent")}
        >
          Validés<span className="count">{count((l) => l.status === "validé")}</span>
        </div>
        <div
          className={"tab" + (tab === "planned" ? " active" : "")}
          onClick={() => setTab("planned")}
        >
          Planifiés<span className="count">{count((l) => l.status === "planifié")}</span>
        </div>
      </div>

      {items === null ? (
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucun livrable n&apos;a encore été créé pour cette mission.
        </div>
      ) : (
        <div className="liv-layout">
          <div className="liv-list">
            {filtered.map((l) => (
              <LivrableCard
                key={l.id}
                l={l}
                active={l.id === openId}
                onClick={() => setOpenId(l.id)}
              />
            ))}
          </div>

          <div className="liv-editor">
            {open ? (
              <LivrablePreview l={open} slug={slug} />
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                Sélectionne un livrable pour le prévisualiser.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Citation {
  chunkId: string;
  docId: string;
  docTitle: string;
  content: string;
  similarity: number;
}

function LivrablePreview({ l, slug }: { l: LivrableRow; slug: string }) {
  const [citations, setCitations] = useState<Citation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCitations(null);
      try {
        const res = await fetch(`/api/livrables/${l.id}/citations`, {
          headers: { "x-mission-slug": slug },
        });
        if (!res.ok) {
          if (!cancelled) setCitations([]);
          return;
        }
        const json = await res.json();
        if (!cancelled) setCitations(json.citations ?? []);
      } catch {
        if (!cancelled) setCitations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [l.id, slug]);

  const tone: "" | "green" | "amber" | "soft" =
    l.status === "validé" ? "green" : l.status === "en cours" ? "amber" : l.status === "planifié" ? "soft" : "";

  return (
    <div className="liv-doc">
      <div className="liv-doc-head">
        <div className="liv-doc-meta">
          <span className="mono muted">
            {l.fmt} · {l.id.toUpperCase().slice(0, 12)} · S{l.week ?? "?"}
          </span>
          <Badge tone={tone} dot={l.status === "en cours"}>
            {l.status}
          </Badge>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 8px" }}>
            <Icon name="eye" /> Aperçu
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: "4px 8px" }}>
            <Icon name="download" /> Télécharger
          </button>
        </div>
      </div>

      {citations && citations.length > 0 && (
        <div className="liv-ai-banner">
          <Icon name="sparkle" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>
              {citations.length} source{citations.length > 1 ? "s" : ""} RAG pertinente{citations.length > 1 ? "s" : ""}
            </div>
            <div className="mono muted" style={{ marginTop: 2 }}>
              Top chunks sémantiquement proches du titre de ce livrable
            </div>
          </div>
        </div>
      )}

      <div className="liv-doc-body">
        <h1 className="liv-doc-title">{l.label}</h1>
        <div className="liv-doc-subtitle">Document {l.fmt}</div>
        <div className="liv-doc-authorline mono">Mission · semaine {l.week ?? "—"}</div>
        {l.sourceTaskLabel && (
          <div
            className="row"
            style={{
              gap: 8,
              marginTop: 12,
              padding: "8px 12px",
              background: "color-mix(in oklch, var(--green) 10%, var(--paper-elevated))",
              border: "1px solid color-mix(in oklch, var(--green) 30%, var(--border))",
              borderRadius: 6,
              fontSize: 12.5,
            }}
          >
            <Icon name="link" />
            <span className="mono" style={{ color: "var(--muted)" }}>ISSU DE LA TÂCHE</span>
            <span style={{ flex: 1 }}>{l.sourceTaskLabel}</span>
          </div>
        )}

        <div className="liv-doc-section">
          <h2 className="liv-doc-h2">Aperçu</h2>
          <p className="liv-doc-p">
            Livrable en statut <strong>{l.status}</strong>
            {l.delivered ? `, livré le ${l.delivered.slice(0, 10)}.` : "."}
            {" "}Le pipeline de génération pré-structurée avec insertion des
            citations inline viendra dans une itération suivante.
          </p>
        </div>

        <div className="liv-doc-section">
          <h2 className="liv-doc-h2">
            Sources disponibles
            {citations === null && <span className="liv-section-badge">chargement</span>}
            {citations !== null && (
              <span className="liv-section-badge">{citations.length}</span>
            )}
          </h2>
          {citations === null && (
            <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
              Recherche dans l&apos;index RAG…
            </div>
          )}
          {citations !== null && citations.length === 0 && (
            <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
              Aucune source indexée ne colle au titre de ce livrable. Indexe des
              documents (CR, specs) via /docs pour enrichir.
            </div>
          )}
          {citations !== null &&
            citations.map((c) => (
              <div
                key={c.chunkId}
                style={{
                  padding: "10px 12px",
                  background: "var(--paper-sunk)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 6,
                  marginTop: 8,
                }}
              >
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ color: "var(--ink)" }}>
                    {c.docTitle}
                  </span>
                  <span
                    className="mono"
                    style={{ marginLeft: "auto", color: c.similarity > 0.7 ? "var(--green-deep)" : "var(--muted)" }}
                  >
                    similarité {c.similarity.toFixed(2)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-dim)",
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  {c.content}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
