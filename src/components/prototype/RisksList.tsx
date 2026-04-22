import Badge from "./Badge";

export interface RiskRow {
  id: string;
  label: string;
  impact: number;
  probability: number;
  status: string;
  mitigation: string | null;
}

export default function RisksList({ risks }: { risks: RiskRow[] }) {
  if (risks.length === 0) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
          Aucun risque enregistré.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 0 }}>
        {risks.map((r, i) => {
          const score = r.impact * r.probability;
          const tone = score >= 12 ? "alert" : score >= 6 ? "amber" : "soft";
          const isLast = i === risks.length - 1;
          return (
            <div
              key={r.id}
              style={{
                padding: "14px 16px",
                borderBottom: isLast ? "none" : "1px solid var(--border-soft)",
                opacity: r.status === "actif" ? 1 : 0.55,
              }}
            >
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <Badge tone={tone} dot>
                  score {score}
                </Badge>
                <Badge tone="soft">{r.status}</Badge>
                <span className="mono" style={{ color: "var(--muted)", marginLeft: "auto" }}>
                  impact {r.impact} · prob {r.probability}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{r.label}</div>
              {r.mitigation && (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  <span className="mono">MITIGATION</span> · {r.mitigation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
