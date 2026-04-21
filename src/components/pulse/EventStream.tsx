import type { PulseEvent } from "@/lib/pulse";

interface Props {
  events: PulseEvent[];
  limit?: number;
}

function toneColor(t: PulseEvent["tone"]): string {
  if (t === "pos") return "var(--color-green, #A5D900)";
  if (t === "neg") return "var(--color-alert, #D95B2F)";
  return "var(--color-muted)";
}

function kindLabel(k: PulseEvent["kind"]): string {
  switch (k) {
    case "decision": return "décision";
    case "recalib": return "recalib";
    case "incoherence": return "incohérence";
    case "plaud": return "plaud";
    case "upload": return "upload";
    case "vision": return "vision";
    default: return "événement";
  }
}

/** Flux chronologique complet (décisions, recalibs, incohérences, signaux, events). */
export default function EventStream({ events, limit = 40 }: Props) {
  const shown = events.slice().reverse().slice(0, limit);

  if (shown.length === 0) {
    return (
      <p className="mono-label" style={{ color: "var(--color-muted)" }}>
        AUCUN ÉVÉNEMENT CAPTÉ
      </p>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {shown.map((e) => {
        const d = new Date(e.t);
        const label = isNaN(d.getTime())
          ? e.t.slice(0, 16)
          : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) +
            " " +
            d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <li
            key={e.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 10px",
              backgroundColor: e.pivot ? "var(--color-paper, #F0EEEB)" : "transparent",
              borderRadius: "4px",
              borderLeft: e.pivot
                ? "3px solid var(--color-alert, #D95B2F)"
                : "3px solid transparent",
              fontSize: "13px",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: toneColor(e.tone),
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="mono-label"
                style={{ color: "var(--color-muted)", marginBottom: 2 }}
              >
                {label} · {kindLabel(e.kind)}
                {e.subject ? ` · ${e.subject}` : ""}
                {e.pivot ? " · BASCULE" : ""}
              </div>
              <div
                style={{
                  color: "var(--color-ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {e.label}
              </div>
            </div>
          </li>
        );
      })}
      {events.length > limit && (
        <li
          className="mono-label"
          style={{ color: "var(--color-muted)", padding: "6px 10px" }}
        >
          +{events.length - limit} ÉVÉNEMENTS PLUS ANCIENS
        </li>
      )}
    </ul>
  );
}
