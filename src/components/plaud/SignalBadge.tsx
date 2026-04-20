import type { PlaudSignalIntensity, PlaudSignalKind } from "@/types";

const KIND_LABELS: Record<PlaudSignalKind, string> = {
  decision: "DÉCISION",
  action: "ACTION",
  risk: "RISQUE",
  opportunity: "OPPORTUNITÉ",
  satisfaction: "SATISFACTION",
  frustration: "FRUSTRATION",
  uncertainty: "INCERTITUDE",
  tension: "TENSION",
  posture_shift: "POSTURE",
};

// Palette sémantique alignée charte Lite Ops (ink, paper, green, amber, alert,
// muted). Pas de couleurs ad-hoc.
const KIND_COLORS: Record<PlaudSignalKind, { fg: string; bg: string }> = {
  decision: { fg: "var(--color-ink)", bg: "var(--color-green)" },
  action: { fg: "var(--color-ink)", bg: "var(--color-green)" },
  opportunity: { fg: "var(--color-ink)", bg: "var(--color-green)" },
  satisfaction: { fg: "var(--color-ink)", bg: "var(--color-green)" },
  risk: { fg: "#FFFFFF", bg: "var(--color-alert, #D95B2F)" },
  frustration: { fg: "#FFFFFF", bg: "var(--color-alert, #D95B2F)" },
  tension: { fg: "#FFFFFF", bg: "var(--color-alert, #D95B2F)" },
  uncertainty: { fg: "var(--color-ink)", bg: "var(--color-border)" },
  posture_shift: { fg: "var(--color-ink)", bg: "#E8A317" },
};

export default function SignalBadge({
  kind,
  intensity,
}: {
  kind: PlaudSignalKind;
  intensity: PlaudSignalIntensity;
}) {
  const { fg, bg } = KIND_COLORS[kind];
  const opacity = intensity === "weak" ? 0.55 : 1;
  const border = intensity === "strong" ? "2px solid var(--color-ink)" : "none";
  return (
    <span
      className="inline-flex items-center font-mono"
      style={{
        backgroundColor: bg,
        color: fg,
        fontSize: "10px",
        letterSpacing: "0.12em",
        padding: "3px 6px",
        opacity,
        border,
        borderRadius: "4px",
      }}
    >
      {KIND_LABELS[kind]}
      <span style={{ marginLeft: 6, opacity: 0.7 }}>
        {intensity === "strong" ? "●●●" : intensity === "moderate" ? "●●" : "●"}
      </span>
    </span>
  );
}
