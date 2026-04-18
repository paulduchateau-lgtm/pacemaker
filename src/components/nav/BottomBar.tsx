"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DEFAULT_MISSION_SLUG } from "@/lib/mission-constants";

type Props = { missionSlug?: string };

function slugFromPath(pathname: string): string {
  const m = pathname.match(/^\/(?:admin\/missions|client)\/([^/]+)/);
  if (m && m[1] && m[1] !== "new") return m[1];
  return DEFAULT_MISSION_SLUG;
}

function items(slug: string) {
  const base = `/admin/missions/${slug}`;
  return {
    main: [
      { href: base, label: "Backlog", icon: "\u25B6", exact: true },
      { href: `${base}/capture`, label: "Capture", icon: "\u25C6" },
      { href: `${base}/docs`, label: "Docs", icon: "\u2605" },
    ],
    more: [
      { href: `${base}/risques`, label: "Risques" },
      { href: `${base}/decisions`, label: "Décisions" },
      { href: `${base}/incoherences`, label: "Incohérences" },
      { href: `${base}/journal`, label: "Journal" },
      { href: `${base}/regles`, label: "Règles" },
      { href: `${base}/contexte`, label: "Contexte" },
      { href: `/client/${slug}`, label: "Vue client" },
      { href: "/admin/missions", label: "Missions" },
    ],
  };
}

export default function BottomBar({ missionSlug }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slug = missionSlug ?? slugFromPath(pathname);
  const { main, more } = items(slug);

  return (
    <>
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
            {more.map((item) => (
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

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          backgroundColor: "var(--color-ink)",
          borderTop: "1px solid var(--color-elevated)",
          height: "56px",
        }}
      >
        {main.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
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
