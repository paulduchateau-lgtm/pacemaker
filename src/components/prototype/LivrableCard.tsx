"use client";

import Badge from "./Badge";

export interface LivrableRow {
  id: string;
  label: string;
  fmt: string;
  week: number | null;
  status: string;
  delivered: string | null;
  sourceTaskId?: string | null;
  sourceTaskLabel?: string | null;
}

const FMT_COLOR: Record<string, string> = {
  PBIX: "#F2C811",
  XLSX: "#217346",
  DOCX: "#2B579A",
  PPTX: "#D24726",
  PDF: "#E74C3C",
};

const TONE_MAP: Record<string, "" | "amber" | "green" | "soft" | "ink"> = {
  "en cours": "amber",
  livré: "ink",
  validé: "green",
  planifié: "soft",
  annulé: "soft",
};

export default function LivrableCard({
  l,
  active,
  onClick,
}: {
  l: LivrableRow;
  active?: boolean;
  onClick?: () => void;
}) {
  const progress =
    l.status === "validé"
      ? 100
      : l.status === "livré"
      ? 90
      : l.status === "en cours"
      ? 45
      : 0;
  const fmtColor = FMT_COLOR[l.fmt.toUpperCase()] ?? "var(--ink)";
  return (
    <div
      className={"liv-card" + (active ? " active" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="liv-card-top">
        <div
          className="liv-fmt"
          style={{ ["--fmt" as string]: fmtColor } as React.CSSProperties}
        >
          <span>{l.fmt}</span>
        </div>
        <div className="liv-card-body">
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="mono muted">
              {l.id.toUpperCase().slice(0, 10)} · S{l.week ?? "?"}
            </span>
            <Badge
              tone={TONE_MAP[l.status] ?? ""}
              dot={l.status === "en cours"}
              style={{ marginLeft: "auto" }}
            >
              {l.status}
            </Badge>
          </div>
          <div className="liv-card-title">{l.label}</div>
          {l.sourceTaskLabel && (
            <div className="mono" style={{ marginTop: 3, fontSize: 10.5, color: "var(--green-deep)" }}>
              ↗ issu de : {l.sourceTaskLabel.slice(0, 60)}
            </div>
          )}
          {l.delivered && (
            <div className="mono muted" style={{ marginTop: 3, fontSize: 10.5 }}>
              livré {l.delivered.slice(0, 10)}
            </div>
          )}
        </div>
      </div>
      <div className="progress" style={{ marginTop: 10 }}>
        <span
          style={{
            width: progress + "%",
            background:
              progress === 100
                ? "var(--green-deep)"
                : progress > 0
                ? "var(--ink)"
                : "var(--border)",
          }}
        />
      </div>
    </div>
  );
}
