"use client";

/** Affiche les tâches et livrables d'une semaine dans le contexte d'une phase. */

interface TaskRow { id: string; label: string; owner: string; priority: string; status: string }
interface LivrableRow { id: string; label: string; status: string }

const PRIORITY_COLOR: Record<string, string> = {
  haute: "var(--alert, #D95B2F)",
  moyenne: "var(--amber, #E8A317)",
  basse: "var(--muted)",
};

const STATUS_ICON: Record<string, string> = {
  fait: "◆", todo: "◇", "en cours": "▶", bloque: "⚠",
};

export default function PhaseWeekSection({
  weekId,
  weekTitle,
  tasks,
  livrables,
}: {
  weekId: number;
  weekTitle: string;
  tasks: TaskRow[];
  livrables: LivrableRow[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row" style={{ gap: 8, marginBottom: 8, padding: "6px 0", borderBottom: "1px solid var(--border-soft)" }}>
        <span className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.12em" }}>
          S{weekId}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{weekTitle}</span>
        <span className="mono muted" style={{ marginLeft: "auto", fontSize: 10.5 }}>
          {tasks.length} tâches · {livrables.length} livr.
        </span>
      </div>

      {tasks.map(t => (
        <div key={t.id} className="row" style={{ gap: 8, padding: "4px 4px", fontSize: 13 }}>
          <span style={{ color: t.status === "fait" ? "var(--green)" : "var(--muted)", width: 12, flexShrink: 0 }}>
            {STATUS_ICON[t.status] ?? "◇"}
          </span>
          <span style={{ flex: 1, color: t.status === "fait" ? "var(--muted)" : "var(--ink)" }}>
            {t.label}
          </span>
          <span className="mono" style={{ fontSize: 10, color: PRIORITY_COLOR[t.priority] ?? "var(--muted)" }}>
            {t.priority?.toUpperCase()}
          </span>
          <span className="mono muted" style={{ fontSize: 10, minWidth: 48, textAlign: "right" }}>{t.owner}</span>
        </div>
      ))}

      {livrables.map(l => (
        <div key={l.id} className="row" style={{ gap: 8, padding: "4px 4px 4px 20px", fontSize: 12.5 }}>
          <span style={{ color: l.status === "valide" ? "var(--green)" : "var(--muted)", fontSize: 10 }}>↑</span>
          <span style={{ flex: 1, color: "var(--ink-dim, var(--ink))" }}>{l.label}</span>
          <span className="mono muted" style={{ fontSize: 10 }}>{l.status}</span>
        </div>
      ))}
    </div>
  );
}
