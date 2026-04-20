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

type Group = {
  label: string;
  items: { href: string; label: string }[];
};

function buildGroups(slug: string): Group[] {
  const base = `/admin/missions/${slug}`;
  return [
    {
      label: "SIGNAL",
      items: [
        { href: `${base}/risques`, label: "Risques" },
        { href: `${base}/incoherences`, label: "Incohérences" },
        { href: `${base}/recalibrations`, label: "Recalibrages" },
      ],
    },
    {
      label: "TRACE",
      items: [
        { href: `${base}/decisions`, label: "Décisions" },
        { href: `${base}/journal-agent`, label: "Journal agent" },
        { href: `${base}/journal`, label: "Journal mission" },
      ],
    },
    {
      label: "INPUTS",
      items: [
        { href: `${base}/plaud`, label: "Plaud" },
        { href: `${base}/contexte`, label: "Contexte mission" },
      ],
    },
    {
      label: "MÉTA",
      items: [
        { href: `${base}/regles`, label: "Règles apprises" },
        { href: `${base}/temps-libere`, label: "Temps libéré" },
      ],
    },
    {
      label: "VUES",
      items: [
        { href: `/client/${slug}`, label: "Vue client" },
        { href: "/admin/missions", label: "Toutes missions" },
      ],
    },
  ];
}

export default function BottomBar({ missionSlug }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slug = missionSlug ?? slugFromPath(pathname);
  const base = `/admin/missions/${slug}`;
  const groups = buildGroups(slug);

  // Les 4 onglets principaux : les plus fréquents
  const main = [
    { href: base, label: "Backlog", icon: "\u25B6", exact: true },
    { href: `${base}/capture`, label: "Capture", icon: "\u25C6" },
    { href: `${base}/docs`, label: "Docs", icon: "\u2605" },
    { href: `${base}/journal-agent`, label: "Journal", icon: "\u25C7" },
  ];

  return (
    <>
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 max-h-[75vh] overflow-y-auto p-3 space-y-3"
            style={{ backgroundColor: "var(--color-ink)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {groups.map((g) => (
              <div key={g.label}>
                <div
                  className="mono-label mb-1 px-2"
                  style={{ color: "var(--color-muted)" }}
                >
                  {g.label}
                </div>
                {g.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className="block py-2.5 px-3 text-sm"
                      style={{
                        color: active
                          ? "var(--color-green)"
                          : "var(--color-paper)",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
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
