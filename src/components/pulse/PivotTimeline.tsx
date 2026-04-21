import type { PulseEvent } from "@/lib/pulse";

interface Props {
  pivots: PulseEvent[];
}

function kindLabel(k: PulseEvent["kind"]): string {
  switch (k) {
    case "decision": return "DÉCISION";
    case "recalib": return "RECALIB";
    case "incoherence": return "INCOHÉRENCE";
    case "plaud": return "PLAUD";
    case "upload": return "UPLOAD";
    case "vision": return "VISION";
    default: return "ÉVÉNEMENT";
  }
}

export default function PivotTimeline({ pivots }: Props) {
  if (pivots.length === 0) {
    return (
      <div
        className="p-4 text-center"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          color: "var(--color-muted)",
        }}
      >
        Aucune bascule détectée — le projet reste sur sa trajectoire initiale.
      </div>
    );
  }

  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {pivots
        .slice()
        .reverse()
        .map((p, idx) => {
          const d = new Date(p.t);
          const date = isNaN(d.getTime())
            ? p.t.slice(0, 10)
            : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
          const time = isNaN(d.getTime())
            ? ""
            : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          return (
            <li
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr",
                gap: 12,
                position: "relative",
                paddingBottom: idx === pivots.length - 1 ? 0 : 16,
              }}
            >
              <div style={{ position: "relative", width: 24 }}>
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 9,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-alert, #D95B2F)",
                    border: "2px solid var(--color-ink)",
                  }}
                />
                {idx !== pivots.length - 1 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 11,
                      bottom: -16,
                      width: 2,
                      backgroundColor: "var(--color-border)",
                    }}
                  />
                )}
              </div>
              <div
                className="p-3"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderLeft: "3px solid var(--color-alert, #D95B2F)",
                  borderRadius: "6px",
                }}
              >
                <div
                  className="mono-label"
                  style={{ color: "var(--color-alert, #D95B2F)", marginBottom: 4 }}
                >
                  BASCULE · {kindLabel(p.kind)} · {date}
                  {time ? ` ${time}` : ""}
                </div>
                <div
                  style={{
                    color: "var(--color-ink)",
                    fontSize: "14px",
                    lineHeight: 1.45,
                  }}
                >
                  {p.label}
                </div>
                {p.pivotReason && (
                  <div
                    style={{
                      color: "var(--color-muted)",
                      fontSize: "13px",
                      marginTop: 6,
                      fontStyle: "italic",
                    }}
                  >
                    {p.pivotReason}
                  </div>
                )}
              </div>
            </li>
          );
        })}
    </ol>
  );
}
