"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/prototype/Icon";

interface TaskOption {
  id: string;
  label: string;
  weekId: number;
  owner: string;
  priority: string;
  livrableCount: number;
}

export default function GenerateFromTaskModal({
  slug,
  onClose,
  onGenerated,
}: {
  slug: string;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [tasks, setTasks] = useState<TaskOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [tRes, lRes] = await Promise.all([
        fetch("/api/data/tasks", { headers: { "x-mission-slug": slug } }),
        fetch("/api/data/livrables", { headers: { "x-mission-slug": slug } }),
      ]);
      const tasksJson = await tRes.json();
      const livrablesJson = await lRes.json();
      const livrables = Array.isArray(livrablesJson) ? livrablesJson : livrablesJson.livrables ?? [];
      const countByTask: Record<string, number> = {};
      for (const l of livrables) if (l.sourceTaskId) countByTask[l.sourceTaskId] = (countByTask[l.sourceTaskId] ?? 0) + 1;
      const raw = Array.isArray(tasksJson) ? tasksJson : tasksJson.tasks ?? [];
      setTasks(
        raw.map((t: Record<string, unknown>) => ({
          id: String(t.id),
          label: String(t.label ?? ""),
          weekId: Number(t.weekId ?? t.week_id ?? 0),
          owner: String(t.owner ?? ""),
          priority: String(t.priority ?? ""),
          livrableCount: countByTask[String(t.id)] ?? 0,
        })),
      );
    })();
  }, [slug]);

  const weeks = useMemo(() => {
    if (!tasks) return [] as number[];
    return [...new Set(tasks.map((t) => t.weekId))].sort((a, b) => a - b);
  }, [tasks]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (weekFilter !== "all" && t.weekId !== weekFilter) return false;
      if (search.trim() && !t.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, weekFilter, search]);

  async function generate() {
    if (!selectedId || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/livrables/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mission-slug": slug },
        body: JSON.stringify({ taskId: selectedId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erreur");
      onGenerated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(28,28,26,0.45)", zIndex: 100, display: "grid", placeItems: "center" }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "min(720px, 92vw)", maxHeight: "86vh", display: "flex", flexDirection: "column", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-head" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <Icon name="sparkle" />
          <span className="card-title">Générer des livrables depuis une tâche</span>
          <button onClick={onClose} className="btn btn-ghost" style={{ marginLeft: "auto", padding: "4px 8px" }}>
            <Icon name="x" />
          </button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une tâche…"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13.5, background: "var(--paper-elevated)" }}
          />
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <button className={"pill" + (weekFilter === "all" ? " active" : "")} onClick={() => setWeekFilter("all")}>Toutes</button>
            {weeks.map((w) => (
              <button key={w} className={"pill" + (weekFilter === w ? " active" : "")} onClick={() => setWeekFilter(w)}>S{w}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 12px" }}>
          {tasks === null && <p className="mono" style={{ color: "var(--muted)" }}>Chargement…</p>}
          {filtered.map((t) => {
            const active = selectedId === t.id;
            return (
              <div
                key={t.id} onClick={() => setSelectedId(t.id)} role="button"
                style={{
                  padding: "10px 12px", marginBottom: 6, borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${active ? "var(--ink)" : "var(--border-soft)"}`,
                  background: active ? "var(--paper-elevated)" : "transparent",
                }}
              >
                <div className="row" style={{ gap: 8 }}>
                  <span className="mono" style={{ color: "var(--muted)" }}>S{t.weekId}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{t.label}</span>
                  {t.livrableCount > 0 && <span className="mono" style={{ color: "var(--green-deep)" }}>{t.livrableCount} livrable{t.livrableCount > 1 ? "s" : ""}</span>}
                  <span className="mono" style={{ color: "var(--muted)" }}>{t.owner}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid var(--border-soft)", display: "flex", gap: 10, alignItems: "center" }}>
          {err && <span className="mono" style={{ color: "var(--alert)" }}>{err}</span>}
          <button onClick={onClose} className="btn btn-ghost" style={{ marginLeft: "auto" }}>Annuler</button>
          <button onClick={generate} disabled={!selectedId || busy} className="btn btn-primary" style={{ opacity: !selectedId || busy ? 0.5 : 1 }}>
            {busy ? "⧳ Génération (15-30s)…" : "▶ Générer"}
          </button>
        </div>
      </div>
    </div>
  );
}
