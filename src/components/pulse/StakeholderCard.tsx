import type { Stakeholder } from "@/lib/pulse";

interface Props {
  s: Stakeholder;
}

function satColor(sat: number): string {
  if (sat >= 0.7) return "var(--color-green, #A5D900)";
  if (sat >= 0.45) return "#E8A317";
  return "var(--color-alert, #D95B2F)";
}

function trendSymbol(t: Stakeholder["trend"]): string {
  return t === "up" ? "↑" : t === "down" ? "↓" : "→";
}

export default function StakeholderCard({ s }: Props) {
  const pct = Math.round(s.sat * 100);
  const color = satColor(s.sat);

  return (
    <article
      className="p-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: `conic-gradient(${color} ${pct}%, var(--color-border) 0)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--color-ink)",
          }}
        >
          {pct}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 500,
            color: "var(--color-ink)",
            fontSize: "14px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {s.name}
          <span
            style={{
              marginLeft: 8,
              color,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "12px",
            }}
          >
            {trendSymbol(s.trend)}
          </span>
        </div>
        <div
          className="mono-label"
          style={{ color: "var(--color-muted)", marginTop: 2 }}
        >
          {s.role.toUpperCase()} · {s.interactions} INTERACTION{s.interactions > 1 ? "S" : ""}
        </div>
      </div>
    </article>
  );
}
