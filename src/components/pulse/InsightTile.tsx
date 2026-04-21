import type { Insight } from "@/lib/pulse";

interface Props {
  insight: Insight;
}

const TONE_COLOR: Record<Insight["tone"], string> = {
  pos: "var(--color-green, #A5D900)",
  neu: "#C4872E",
  neg: "var(--color-alert, #D95B2F)",
};

const ICON_EMOJI: Record<Insight["icon"], string> = {
  flag: "⚑",
  warn: "⚠",
  heart: "★",
};

export default function InsightTile({ insight }: Props) {
  const color = TONE_COLOR[insight.tone];
  return (
    <article
      className="p-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: color + "26",
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          {ICON_EMOJI[insight.icon]}
        </span>
        <span className="mono-label" style={{ color }}>
          {insight.label.toUpperCase()}
        </span>
      </header>

      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--color-ink)",
          lineHeight: 1.35,
        }}
      >
        {insight.title}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--color-ink)",
          lineHeight: 1.45,
        }}
      >
        {insight.body}
      </p>

      <div
        className="mono-label"
        style={{
          color: "var(--color-muted)",
          padding: "6px 8px",
          backgroundColor: "var(--color-paper, #F0EEEB)",
          borderRadius: 4,
          marginTop: "auto",
        }}
      >
        RÈGLE : {insight.rule}
      </div>

      <div
        style={{
          fontSize: 13,
          color,
          fontWeight: 500,
          marginTop: 4,
        }}
      >
        → {insight.action}
      </div>
    </article>
  );
}
