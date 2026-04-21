"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import LivrableCard, { type LivrableRow } from "@/components/prototype/LivrableCard";

export default function LivrablesV2Page() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [items, setItems] = useState<LivrableRow[] | null>(null);
  const [tab, setTab] = useState<"all" | "drafts" | "review" | "sent" | "planned">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch("/api/data/livrables", {
      headers: { "x-mission-slug": slug },
    });
    const json = await res.json();
    const raw: LivrableRow[] = (json.livrables ?? json ?? []).map(
      (l: Record<string, unknown>) => ({
        id: String(l.id),
        label: String(l.label ?? l.titre ?? "Livrable"),
        fmt: String(l.fmt ?? l.format ?? "").toUpperCase() || "DOC",
        week: l.weekId != null ? Number(l.weekId) : l.week_id != null ? Number(l.week_id) : null,
        status: String(l.status ?? "planifié"),
        delivered: (l.deliveryDate as string | null) ?? (l.delivered as string | null) ?? null,
      }),
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
      </div>

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
              <LivrablePreview l={open} />
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

function LivrablePreview({ l }: { l: LivrableRow }) {
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

      <div className="liv-doc-body">
        <h1 className="liv-doc-title">{l.label}</h1>
        <div className="liv-doc-subtitle">Document {l.fmt}</div>
        <div className="liv-doc-authorline mono">Mission · semaine {l.week ?? "—"}</div>

        <div className="liv-doc-section">
          <h2 className="liv-doc-h2">Aperçu</h2>
          <p className="liv-doc-p">
            Livrable en statut <strong>{l.status}</strong>
            {l.delivered ? `, livré le ${l.delivered.slice(0, 10)}.` : "."}
            {" "}Le contenu détaillé (citations + sections enrichies) sera
            accessible via le pipeline de génération pré-structurée dans une
            itération ultérieure.
          </p>
        </div>
      </div>
    </div>
  );
}
