"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import LivrableCard, { type LivrableRow } from "@/components/prototype/LivrableCard";
import GenerateFromTaskModal from "@/components/prototype/livrables/GenerateFromTaskModal";
import type { PanelContent } from "@/hooks/useSidePanel";

interface Props {
  slug: string;
  onOpenPanel?: (content: PanelContent) => void;
}

type TabFilter = "all" | "drafts" | "review" | "sent" | "planned";

export default function LivrablesTab({ slug, onOpenPanel }: Props) {
  const [items, setItems] = useState<LivrableRow[] | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    const [lRes, tRes] = await Promise.all([
      fetch("/api/data/livrables", { headers: { "x-mission-slug": slug } }),
      fetch("/api/data/tasks", { headers: { "x-mission-slug": slug } }),
    ]);
    const [lj, tj] = await Promise.all([lRes.json(), tRes.json()]);
    const tasks = Array.isArray(tj) ? tj : tj.tasks ?? [];
    const taskLabelById: Record<string, string> = {};
    for (const t of tasks) taskLabelById[String(t.id)] = String(t.label ?? "");
    const raw: LivrableRow[] = (lj.livrables ?? lj ?? []).map((l: Record<string, unknown>) => {
      const sourceTaskId = (l.sourceTaskId as string | null) ?? null;
      return {
        id: String(l.id),
        label: String(l.label ?? l.titre ?? "Livrable"),
        fmt: String(l.fmt ?? l.format ?? "").toUpperCase() || "DOC",
        week: l.weekId != null ? Number(l.weekId) : l.week_id != null ? Number(l.week_id) : null,
        status: String(l.status ?? "planifie"),
        delivered: (l.deliveryDate as string | null) ?? (l.delivered as string | null) ?? null,
        sourceTaskId,
        sourceTaskLabel: sourceTaskId ? (taskLabelById[sourceTaskId] ?? null) : null,
      };
    });
    setItems(raw);
    if (raw.length > 0 && !openId) setOpenId(raw[0].id);
  }, [slug, openId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((l) => {
      if (tab === "drafts") return l.status === "en cours";
      if (tab === "review") return l.status === "livre";
      if (tab === "sent") return l.status === "valide";
      if (tab === "planned") return l.status === "planifie";
      return true;
    });
  }, [items, tab]);

  const count = (pred: (l: LivrableRow) => boolean) => items ? items.filter(pred).length : 0;

  const handleClick = (l: LivrableRow) => {
    if (onOpenPanel) {
      onOpenPanel({ type: "livrable", id: l.id });
    } else {
      setOpenId(l.id);
    }
  };

  return (
    <div className="liv-page">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Icon name="sparkle" /> Generer depuis une tache
        </button>
      </div>
      {modalOpen && (
        <GenerateFromTaskModal slug={slug} onClose={() => setModalOpen(false)} onGenerated={load} />
      )}
      <div className="tabs">
        {(["all", "drafts", "review", "sent", "planned"] as TabFilter[]).map((t) => {
          const labels: Record<TabFilter, string> = { all: "Tous", drafts: "En cours", review: "Livres", sent: "Valides", planned: "Planifies" };
          const counts: Record<TabFilter, number> = {
            all: items?.length ?? 0,
            drafts: count((l) => l.status === "en cours"),
            review: count((l) => l.status === "livre"),
            sent: count((l) => l.status === "valide"),
            planned: count((l) => l.status === "planifie"),
          };
          return (
            <div key={t} className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
              {labels[t]}<span className="count">{counts[t]}</span>
            </div>
          );
        })}
      </div>
      {items === null ? (
        <p style={{ color: "var(--muted)" }}>Chargement...</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucun livrable cree pour cette mission.
        </div>
      ) : (
        <div className="liv-layout">
          <div className="liv-list">
            {filtered.map((l) => (
              <LivrableCard key={l.id} l={l} active={l.id === openId} onClick={() => handleClick(l)} />
            ))}
          </div>
          <div className="liv-editor">
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              <Badge tone="soft">
                {openId ? "Cliquer sur un livrable" : "Aucune selection"}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
