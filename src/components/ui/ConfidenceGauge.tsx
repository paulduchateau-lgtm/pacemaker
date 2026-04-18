/**
 * Jauge de confiance minimale : 3 segments (faible / moyen / élevé) + tooltip.
 * Couleur choisie en fonction du niveau ; sobre, pas intrusive.
 * Cf. chantier 06 — principe manifeste P6 (afficher l'incertitude).
 */

type Props = {
  value: number | null | undefined;
  reasoning?: string | null;
  size?: "sm" | "md";
};

function colorFor(v: number): string {
  if (v >= 0.85) return "var(--color-green)";
  if (v >= 0.6) return "var(--color-amber)";
  return "var(--color-alert)";
}

export default function ConfidenceGauge({ value, reasoning, size = "sm" }: Props) {
  if (value === null || value === undefined) return null;
  const clamped = Math.max(0, Math.min(1, value));
  const color = colorFor(clamped);
  const dotSize = size === "sm" ? 6 : 8;
  const title = reasoning
    ? `Confiance ${Math.round(clamped * 100)}% — ${reasoning}`
    : `Confiance ${Math.round(clamped * 100)}%`;

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1"
      style={{ verticalAlign: "middle" }}
    >
      <span
        aria-label={`Confiance ${Math.round(clamped * 100)} %`}
        style={{
          display: "inline-block",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <span
        className="mono-label"
        style={{
          color: "var(--color-muted)",
          fontSize: size === "sm" ? "9px" : "10px",
        }}
      >
        {Math.round(clamped * 100)}%
      </span>
    </span>
  );
}
