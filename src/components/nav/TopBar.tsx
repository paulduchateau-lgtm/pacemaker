"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Backlog" },
  { href: "/admin/risques", label: "Risques" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/capture", label: "Capture" },
  { href: "/admin/docs", label: "Docs" },
];

export default function TopBar() {
  const pathname = usePathname();
  const isClient = pathname.startsWith("/client");

  return (
    <header
      className="sticky top-0 z-50 px-4 md:px-6 py-3"
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/admin" className="font-mono text-sm font-medium tracking-wider">
            PACEMAKER
          </Link>
          <nav className="hidden lg:flex gap-4">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mono-label transition-colors"
                  style={{
                    color: isActive ? "var(--color-green)" : "var(--color-paper)",
                    opacity: isActive ? 1 : 0.6,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <Link
          href={isClient ? "/admin" : "/client"}
          className="mono-label"
          style={{ color: "var(--color-muted)" }}
        >
          {isClient ? "ADMIN" : "CLIENT"}
        </Link>
      </div>
    </header>
  );
}
