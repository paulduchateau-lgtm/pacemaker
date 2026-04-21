import type { SignalMixBucket } from "@/lib/pulse";

interface Props {
  mix: SignalMixBucket[];
}

const COLORS: Record<SignalMixBucket["label"], string> = {
  "Positifs": "var(--color-green, #A5D900)",
  "Neutres": "var(--color-muted)",
  "Négatifs": "var(--color-alert, #D95B2F)",
  "Bascules": "#C4872E",
};

export default function SignalMix({ mix }: Props) {
  const total = mix.reduce((s, m) => s + m.count, 0);

  return (
    <section
      className="p-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <header
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}
      >
        <span className="mono-label" style={{ color: "var(--color-ink)" }}>
          NATURE DES SIGNAUX
        </span>
        <span
          className="mono-label"
          style={{ color: "var(--color-muted)", marginLeft: "auto" }}
        >
          {total} · FENÊTRE EN COURS
        </span>
      </header>

      {total === 0 ? (
        <p className="mono-label" style={{ color: "var(--color-muted)" }}>
          AUCUN SIGNAL CAPTÉ
        </p>
      ) : (
        <>
          <div
            aria-hidden
            style={{
              display: "flex",
              height: 10,
              borderRadius: 999,
              overflow: "hidden",
              border: "1px solid var(--color-border)",
            }}
          >
            {mix.map((m) => (
              <span
                key={m.label}
                title={`${m.label} · ${m.count}`}
                style={{
                  flex: m.count,
                  backgroundColor: COLORS[m.label],
                  minWidth: m.count > 0 ? 4 : 0,
                }}
              />
            ))}
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "12px 0 0 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8,
            }}
          >
            {mix.map((m) => (
              <li
                key={m.label}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: COLORS[m.label],
                  }}
                />
                <span style={{ color: "var(--color-ink)" }}>{m.label}</span>
                <span
                  className="mono-label"
                  style={{ color: "var(--color-muted)", marginLeft: "auto" }}
                >
                  {m.count}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
