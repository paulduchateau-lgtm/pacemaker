interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export default function Badge({ label, color, bg }: BadgeProps) {
  return (
    <span
      className="mono-label inline-block px-2 py-0.5"
      style={{
        color: color || "var(--color-muted)",
        backgroundColor: bg || "transparent",
        border: `1px solid ${color || "var(--color-border)"}`,
        borderRadius: "4px",
      }}
    >
      {label}
    </span>
  );
}
