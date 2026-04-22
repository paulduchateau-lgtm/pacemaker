"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: string;
  count?: number | null;
  alert?: boolean;
  pill?: string;
  live?: boolean;
  hint?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface Props {
  slug: string;
  mission: { client: string; label: string };
  counts: {
    inbox?: number;
    tasks?: number;
    livrables?: number;
    decisions?: number;
    incoh?: number;
    sources?: number;
  };
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 8 L5 8 L6.5 4 L9.5 12 L11 8 L14 8" stroke="#EEE9DC" />
      </svg>
    </div>
  );
}

const COLLAPSE_KEY = "pacemaker-v2-sidebar-collapsed";

export default function Sidebar({ slug, mission, counts }: Props) {
  const pathname = usePathname();
  const base = `/admin/missions/${slug}/v2`;
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Hydrate depuis localStorage au premier mount
  useEffect(() => {
    const v = localStorage.getItem(COLLAPSE_KEY);
    if (v === "1") setCollapsed(true);
  }, []);

  // Mutation de la classe parent .app-shell pour que le grid s'adapte
  useEffect(() => {
    const shell = document.querySelector(".app-shell");
    if (!shell) return;
    shell.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  };
  const sections: NavSection[] = [
    {
      title: "Aujourd'hui",
      items: [
        { id: "home", href: `${base}/briefing`, label: "Briefing", icon: "home", live: true },
        { id: "inbox", href: `${base}/inbox`, label: "Inbox capture", icon: "inbox", count: counts.inbox ?? null },
      ],
    },
    {
      title: "Travail courant",
      items: [
        { id: "plan", href: `${base}/plan`, label: "Plan de mission", icon: "plan", count: counts.tasks ?? null },
        { id: "livrables", href: `${base}/livrables`, label: "Livrables", icon: "livrables", count: counts.livrables ?? null },
        { id: "decisions", href: `${base}/decisions`, label: "Décisions", icon: "decisions", count: counts.decisions ?? null },
      ],
    },
    {
      title: "Signaux",
      items: [
        { id: "incoh", href: `${base}/incoherences`, label: "Incohérences & risques", icon: "incoh", count: counts.incoh ?? null, alert: true },
        { id: "pulse", href: `${base}/pulse`, label: "Pulse humain", icon: "pulse", pill: "NEW" },
      ],
    },
    {
      title: "Méta",
      items: [
        { id: "contexte", href: `${base}/contexte`, label: "Contexte mission", icon: "settings" },
        { id: "recalibrations", href: `${base}/recalibrations`, label: "Recalibrages & agent", icon: "branch" },
        { id: "regles", href: `${base}/regles`, label: "Règles apprises", icon: "scroll" },
      ],
    },
    {
      title: "Archive",
      items: [
        { id: "sources", href: `${base}/sources`, label: "Sources & RAG", icon: "sources", count: counts.sources ?? null },
        { id: "reports", href: `${base}/temps-libere`, label: "Temps libéré", icon: "reports" },
      ],
    },
  ];

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Pacemaker</span>
        <span className="brand-env">v2</span>
        <button
          onClick={toggle}
          className="sidebar-toggle"
          aria-label={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
          title={collapsed ? "Déplier" : "Replier"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <div className="mission-switch" data-tip="Changer de mission">
        <span className="client-dot" />
        <div className="ms-meta">
          <div className="ms-client">{mission.client}</div>
          <div className="ms-label">{mission.label}</div>
        </div>
        <span className="ms-caret">⇅</span>
      </div>

      <nav className="nav">
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 2 }}>
            <div className="nav-section-title">{sec.title}</div>
            {sec.items.map((it) => {
              const active = pathname.startsWith(it.href);
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={"nav-item" + (active ? " active" : "")}
                >
                  <Icon name={it.icon} className="nav-icon" />
                  <span>{it.label}</span>
                  {it.pill && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        background: "var(--green)",
                        color: "var(--ink)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {it.pill}
                    </span>
                  )}
                  {it.count != null && it.count > 0 && (
                    <span className={"nav-count" + (it.alert ? " alert" : "")}>{it.count}</span>
                  )}
                  {it.hint && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{it.hint}</span>}
                  {it.live && it.count == null && !it.pill && !it.hint && <span className="nav-dot-live" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">PD</div>
        <div className="ident">
          <div className="who">Paul Duchâteau</div>
          <div className="role">Senior · Lite Ops</div>
        </div>
        <Icon name="settings" className="nav-icon" />
      </div>
    </aside>
  );
}
