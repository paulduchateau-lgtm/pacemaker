"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RulesCounter from "@/components/corrections/RulesCounter";
import { DEFAULT_MISSION_SLUG } from "@/lib/mission-constants";

type Props = {
  missionSlug?: string;
  missionLabel?: string;
};

function slugFromPath(pathname: string): string {
  const m = pathname.match(/^\/(?:admin\/missions|client)\/([^/]+)/);
  if (m && m[1] && m[1] !== "new") return m[1];
  return DEFAULT_MISSION_SLUG;
}

function buildNav(slug: string) {
  const base = `/admin/missions/${slug}`;
  return [
    { href: base, label: "Backlog", exact: true },
    { href: `${base}/risques`, label: "Risques" },
    { href: `${base}/decisions`, label: "Décisions" },
    { href: `${base}/incoherences`, label: "Incohérences" },
    { href: `${base}/journal`, label: "Journal" },
    { href: `${base}/capture`, label: "Capture" },
    { href: `${base}/docs`, label: "Docs" },
    { href: `${base}/regles`, label: "Règles" },
    { href: `${base}/contexte`, label: "Contexte" },
  ];
}

export default function TopBar({ missionSlug, missionLabel }: Props) {
  const pathname = usePathname();
  const isClient = pathname.startsWith("/client");
  const slug = missionSlug ?? slugFromPath(pathname);
  const items = buildNav(slug);
  const backlog = items[0].href;
  const toggleTarget = isClient
    ? `/admin/missions/${slug}`
    : `/client/${slug}`;

  return (
    <header
      className="sticky top-0 z-50 px-4 md:px-6 py-3"
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link
            href={backlog}
            className="font-mono text-sm font-medium tracking-wider"
          >
            PACEMAKER
          </Link>
          {missionLabel && (
            <Link
              href="/admin/missions"
              className="hidden lg:inline mono-label"
              style={{ color: "var(--color-muted)" }}
              title="Voir toutes les missions"
            >
              {missionLabel}
            </Link>
          )}
          <nav className="hidden lg:flex gap-4">
            {items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mono-label transition-colors"
                  style={{
                    color: isActive
                      ? "var(--color-green)"
                      : "var(--color-paper)",
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
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
