import type { TaskStatus, RiskStatus, LivrableStatus } from "@/types";

type AnyStatus = TaskStatus | RiskStatus | LivrableStatus;

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  "à faire": { color: "var(--color-muted)", bg: "transparent" },
  "en cours": { color: "var(--color-green)", bg: "rgba(165,217,0,0.1)" },
  bloqué: { color: "var(--color-alert)", bg: "rgba(217,91,47,0.1)" },
  fait: { color: "var(--color-ink)", bg: "rgba(165,217,0,0.15)" },
  actif: { color: "var(--color-alert)", bg: "rgba(217,91,47,0.1)" },
  mitigé: { color: "var(--color-amber)", bg: "rgba(196,135,46,0.1)" },
  clos: { color: "var(--color-muted)", bg: "rgba(138,134,128,0.1)" },
  planifié: { color: "var(--color-muted)", bg: "transparent" },
  livré: { color: "var(--color-green)", bg: "rgba(165,217,0,0.1)" },
  validé: { color: "var(--color-ink)", bg: "rgba(165,217,0,0.15)" },
};

export default function StatusBadge({ status }: { status: AnyStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["à faire"];
  return (
    <span
      className="mono-label inline-block px-2 py-0.5"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}`,
        borderRadius: "4px",
      }}
    >
      {status}
    </span>
  );
}
