"use client";

import { formatDeltaLabel } from "@/lib/dates";

interface DeltaIndicatorProps {
  delta: number;
  label?: string;
  compact?: boolean;
}

export default function DeltaIndicator({
  delta,
  label,
  compact = false,
}: DeltaIndicatorProps) {
  if (delta === 0 && compact) return null;

  const color =
    delta < 0
      ? "var(--color-green)"
      : delta > 0
        ? "#E8A317"
        : "var(--color-muted)";

  const symbol = delta < 0 ? "↑" : delta > 0 ? "⚠" : "◆";

  return (
    <span
      className="mono-label inline-flex items-center gap-1"
      style={{ color }}
    >
      <span>{symbol}</span>
      {label && <span>{label} :</span>}
      <span>{formatDeltaLabel(delta)}</span>
    </span>
  );
}
