"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import RulesCounter from "@/components/corrections/RulesCounter";
import { DEFAULT_MISSION_SLUG } from "@/lib/mission-constants";

type Props = {
  missionSlug?: string;
  missionLabel?: string;
};

type NavItem = { href: string; label: string; exact?: boolean };
type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

function slugFromPath(pathname: string): string {
  const m = pathname.match(/^\/(?:admin\/missions|client)\/([^/]+)/);
  if (m && m[1] && m[1] !== "new") return m[1];
  return DEFAULT_MISSION_SLUG;
}

function buildGroups(slug: string): NavGroup[] {
  const base = `/admin/missions/${slug}`;
  return [
    {
      key: "signal",
      label: "Signal",
      items: [
        { href: `${base}/risques`, label: "Risques" },
        { href: `${base}/incoherences`, label: "Incohérences" },
        { href: `${base}/recalibrations`, label: "Recalibrages" },
      ],
    },
    {
      key: "trace",
      label: "Trace",
      items: [
        { href: `${base}/decisions`, label: "Décisions" },
        { href: `${base}/journal-agent`, label: "Journal agent" },
        { href: `${base}/journal`, label: "Journal mission" },
      ],
    },
    {
      key: "inputs",
      label: "Inputs",
      items: [
        { href: `${base}/capture`, label: "Capture photo" },
        { href: `${base}/docs`, label: "Documents" },
        { href: `${base}/plaud`, label: "Plaud" },
        { href: `${base}/contexte`, label: "Contexte mission" },
      ],
    },
    {
      key: "meta",
      label: "Méta",
      items: [
        { href: `${base}/regles`, label: "Règles apprises" },
        { href: `${base}/temps-libere`, label: "Temps libéré" },
      ],
    },
  ];
}

function Dropdown({
  group,
  pathname,
  onClose,
}: {
  group: NavGroup;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute top-full left-0 mt-1 min-w-[200px] py-1"
      style={{
        backgroundColor: "var(--color-ink)",
        border: "1px solid var(--color-elevated)",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      {group.items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block px-3 py-2 text-xs"
            style={{
              color: active ? "var(--color-green)" : "var(--color-paper)",
              opacity: active ? 1 : 0.85,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function TopBar({ missionSlug, missionLabel }: Props) {
  const pathname = usePathname();
  const isClient = pathname.startsWith("/client");
  const slug = missionSlug ?? slugFromPath(pathname);
  const groups = buildGroups(slug);
  const backlog = `/admin/missions/${slug}`;
  const toggleTarget = isClient
    ? `/admin/missions/${slug}`
    : `/client/${slug}`;

  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Click-outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpenKey(null);
    }
    if (openKey) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [openKey]);

  return (
    <header
      ref={containerRef as React.Ref<HTMLElement>}
      className="sticky top-0 z-50 px-4 md:px-6 py-3"
      style={{
        backgroundColor: "var(--color-ink)",
        color: "var(--color-paper)",
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 lg:gap-5 min-w-0">
          <Link
            href={backlog}
            className="font-mono text-sm font-medium tracking-wider shrink-0"
          >
            PACEMAKER
          </Link>
          {missionLabel && (
            <Link
              href="/admin/missions"
              className="hidden lg:inline mono-label truncate"
              style={{ color: "var(--color-muted)" }}
              title={`Missions (${missionLabel})`}
            >
              {missionLabel}
            </Link>
          )}
          <nav className="hidden lg:flex gap-1 items-center">
            <Link
              href={backlog}
              className="mono-label px-2 py-1"
              style={{
                color:
                  pathname === backlog
                    ? "var(--color-green)"
                    : "var(--color-paper)",
                opacity: pathname === backlog ? 1 : 0.7,
              }}
            >
              Backlog
            </Link>
            {groups.map((g) => {
              const hasActive = g.items.some((i) =>
                pathname.startsWith(i.href),
              );
              return (
                <div key={g.key} className="relative">
                  <button
                    onClick={() =>
                      setOpenKey((k) => (k === g.key ? null : g.key))
                    }
                    className="mono-label px-2 py-1"
                    style={{
                      color: hasActive
                        ? "var(--color-green)"
                        : "var(--color-paper)",
                      opacity: hasActive ? 1 : 0.7,
                    }}
                  >
                    {g.label} {openKey === g.key ? "▲" : "▼"}
                  </button>
                  {openKey === g.key && (
                    <Dropdown
                      group={g}
                      pathname={pathname}
                      onClose={() => setOpenKey(null)}
                    />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:block">
            <RulesCounter missionSlug={slug} />
          </div>
          <Link
            href={toggleTarget}
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            {isClient ? "ADMIN" : "CLIENT"}
          </Link>
        </div>
      </div>
    </header>
  );
}
