interface ProgressBarProps {
  pct: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({
  pct,
  color = "var(--color-green)",
  height = 6,
}: ProgressBarProps) {
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        backgroundColor: "var(--color-border)",
        borderRadius: "3px",
        height,
      }}
    >
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          backgroundColor: color,
          borderRadius: "3px",
        }}
      />
    </div>
  );
}
