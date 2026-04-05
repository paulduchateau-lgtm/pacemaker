"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MAIN_ITEMS = [
  { href: "/admin", label: "Backlog", icon: "\u25B6" },
  { href: "/admin/capture", label: "Capture", icon: "\u25C6" },
  { href: "/admin/docs", label: "Docs", icon: "\u2605" },
];

const MORE_ITEMS = [
  { href: "/admin/risques", label: "Risques" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/client", label: "Vue client" },
];

export default function BottomBar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 p-4"
            style={{ backgroundColor: "var(--color-ink)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="block py-3 px-4 mono-label"
                style={{
                  color: pathname.startsWith(item.href)
                    ? "var(--color-green)"
                    : "var(--color-paper)",
                  borderBottom: "1px solid var(--color-elevated)",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar - mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          backgroundColor: "var(--color-ink)",
          borderTop: "1px solid var(--color-elevated)",
          height: "56px",
        }}
      >
        {MAIN_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center min-h-[44px]"
              style={{
                color: isActive ? "var(--color-green)" : "var(--color-muted)",
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mono-label mt-0.5" style={{ fontSize: "9px" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="flex-1 flex flex-col items-center justify-center min-h-[44px]"
          style={{
            color: drawerOpen ? "var(--color-green)" : "var(--color-muted)",
          }}
        >
          <span className="text-lg">{drawerOpen ? "\u2715" : "\u2261"}</span>
          <span className="mono-label mt-0.5" style={{ fontSize: "9px" }}>
            PLUS
          </span>
        </button>
      </nav>
    </>
  );
}
