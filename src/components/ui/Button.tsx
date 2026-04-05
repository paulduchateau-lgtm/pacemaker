interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}

const VARIANTS = {
  primary: {
    bg: "var(--color-green)",
    color: "var(--color-ink)",
    border: "transparent",
  },
  secondary: {
    bg: "transparent",
    color: "var(--color-ink)",
    border: "var(--color-border)",
  },
  danger: {
    bg: "transparent",
    color: "var(--color-alert)",
    border: "var(--color-alert)",
  },
};

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <button
      className={`mono-label px-4 py-2 min-h-[44px] cursor-pointer transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        backgroundColor: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: "6px",
      }}
      {...props}
    >
      {children}
    </button>
  );
}
