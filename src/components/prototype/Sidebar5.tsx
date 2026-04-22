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
  live?: boolean;
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
    incoh?: number;
  };
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M2 8 L5 8 L6.5 4 L9.5 12 L11 8 L14 8" stroke="#EEE9DC" />
      </svg>
    </div>
  );
}

const COLLAPSE_KEY = "pacemaker-sidebar5-collapsed";

export default function Sidebar5({ slug, mission, counts }: Props) {
  const pathname = usePathname();
  const base = `/admin/missions/${slug}`;
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const v = localStorage.getItem(COLLAPSE_KEY);
    if (v === "1") setCollapsed(true);
  }, []);

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
        {
          id: "briefing",
          href: `${base}/briefing`,
          label: "Briefing",
          icon: "home",
          live: true,
        },
        {
          id: "inbox",
          href: `${base}/inbox`,
          label: "Inbox",
          icon: "inbox",
          count: counts.inbox ?? null,
        },
      ],
    },
    {
      title: "Travail",
      items: [
        {
          id: "plan",
          href: `${base}/plan`,
          label: "Plan",
          icon: "plan",
          count: counts.tasks ?? null,
        },
        {
          id: "signaux",
          href: `${base}/signaux`,
          label: "Signaux",
          icon: "incoh",
          count: counts.incoh ?? null,
          alert: true,
        },
        {
          id: "memoire",
          href: `${base}/memoire`,
          label: "Memoire",
          icon: "scroll",
        },
      ],
    },
  ];

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Pacemaker</span>
        <button
          onClick={toggle}
          className="sidebar-toggle"
          aria-label={collapsed ? "Deplier la sidebar" : "Replier la sidebar"}
          title={collapsed ? "Deplier" : "Replier"}
        >
          {collapsed ? ">>" : "<<"}
        </button>
      </div>

      <div className="mission-switch" data-tip="Changer de mission">
        <span className="client-dot" />
        <div className="ms-meta">
          <div className="ms-client">{mission.client}</div>
          <div className="ms-label">{mission.label}</div>
        </div>
        <span className="ms-caret">&#8645;</span>
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
                  {it.count != null && it.count > 0 && (
                    <span
                      className={"nav-count" + (it.alert ? " alert" : "")}
                    >
                      {it.count}
                    </span>
                  )}
                  {it.live && it.count == null && (
                    <span className="nav-dot-live" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">PD</div>
        <div className="ident">
          <div className="who">Paul Duchateau</div>
          <div className="role">Senior · Lite Ops</div>
        </div>
        <Icon name="settings" className="nav-icon" />
      </div>
    </aside>
  );
}
