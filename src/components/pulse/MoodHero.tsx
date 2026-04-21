import type { MoodPoint, PulseEvent } from "@/lib/pulse";

interface Props {
  score: number;
  delta: number;
  stakeholdersCount: number;
  series: MoodPoint[];
  pivots: PulseEvent[];
}

function gaugeColor(v: number): string {
  if (v > 0.7) return "var(--color-green, #A5D900)";
  if (v >= 0.5) return "#C4872E";
  return "var(--color-alert, #D95B2F)";
}

function MoodGauge({ value }: { value: number }) {
  const r = 52, cx = 60, cy = 60;
  const start = Math.PI, end = 0;
  const angle = start + (end - start) * value;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;
  const color = gaugeColor(value);
  return (
    <svg viewBox="0 0 120 70" width="120" height="70" aria-hidden>
      <path d={bgPath} fill="none" stroke="var(--color-border)" strokeWidth="10" strokeLinecap="round" />
      <path d={fgPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <circle cx={x} cy={y} r="4" fill={color} stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}

function SignalBars({ series }: { series: MoodPoint[] }) {
  const totals = series.map((d) => d.pos + d.neu + d.neg);
  const max = Math.max(...totals, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 70 }}>
      {series.map((d, i) => {
        const total = d.pos + d.neu + d.neg;
        const h = (total / max) * 60;
        return (
          <div
            key={i}
            title={`${d.day} : ${d.pos} pos, ${d.neu} neu, ${d.neg} neg`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column-reverse",
              height: h || 2,
              minWidth: 6,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "var(--color-border)",
            }}
          >
            {d.pos > 0 && (
              <span style={{ flex: d.pos, backgroundColor: "var(--color-green, #A5D900)" }} />
            )}
            {d.neu > 0 && <span style={{ flex: d.neu, backgroundColor: "var(--color-muted)" }} />}
            {d.neg > 0 && (
              <span style={{ flex: d.neg, backgroundColor: "var(--color-alert, #D95B2F)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MoodHero({ score, delta, stakeholdersCount, series, pivots }: Props) {
  const pct = Math.round(score * 100);
  const deltaPts = Math.round(Math.abs(delta) * 100);
  const deltaArrow = delta < -0.005 ? "↓" : delta > 0.005 ? "↑" : "→";
  const deltaColor =
    delta < -0.005
      ? "var(--color-alert, #D95B2F)"
      : delta > 0.005
      ? "var(--color-green, #A5D900)"
      : "var(--color-muted)";

  const topTilts = pivots.slice(-3).reverse();

  return (
    <section
      className="p-4"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 24,
      }}
    >
      <div>
        <div className="mono-label" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
          HUMEUR PROJET
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <MoodGauge value={score} />
          <div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 32, color: "var(--color-ink)" }}>
              {pct}
              <span style={{ fontSize: 13, color: "var(--color-muted)", marginLeft: 4 }}>/100</span>
            </div>
            <div className="mono-label" style={{ marginTop: 6, color: deltaColor }}>
              {deltaArrow} {deltaPts} PTS / 7J · {stakeholdersCount} ACTEURS
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mono-label" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
          SIGNAUX — 14J
        </div>
        <SignalBars series={series} />
        <div
          className="mono-label"
          style={{ color: "var(--color-muted)", marginTop: 8, display: "flex", gap: 12 }}
        >
          <span>
            <span
              style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-green, #A5D900)", marginRight: 4 }}
            />
            POS
          </span>
          <span>
            <span style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-muted)", marginRight: 4 }} />
            NEU
          </span>
          <span>
            <span
              style={{ display: "inline-block", width: 8, height: 8, background: "var(--color-alert, #D95B2F)", marginRight: 4 }}
            />
            NEG
          </span>
        </div>
      </div>

      <div>
        <div className="mono-label" style={{ color: "var(--color-muted)", marginBottom: 8 }}>
          BASCULES DÉTECTÉES
        </div>
        {topTilts.length === 0 ? (
          <div className="mono-label" style={{ color: "var(--color-muted)" }}>
            AUCUNE
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {topTilts.map((p) => {
              const d = new Date(p.t);
              const label = isNaN(d.getTime())
                ? p.t.slice(0, 10)
                : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
              return (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--color-ink)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-alert, #D95B2F)",
                      marginTop: 7,
                      flexShrink: 0,
                    }}
                  />
                  <span className="mono-label" style={{ color: "var(--color-muted)", minWidth: 36 }}>
                    {label}
                  </span>
                  <span style={{ flex: 1, lineHeight: 1.35 }}>{p.pivotReason ?? p.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
