"use client";

import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  width?: "default" | "wide";
}

export default function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  width = "default",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const panelWidth = width === "wide" ? 960 : 720;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(28,28,26,0.35)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: `min(${panelWidth}px, 100vw)`,
          height: "100%",
          background: "var(--paper-elevated)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                className="mono"
                style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              border: "1px solid var(--border-soft)",
              background: "transparent",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              color: "var(--muted)",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            x
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
