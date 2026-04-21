import type { ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  crumbs: string[];
  extra?: ReactNode;
}

/** TopBar prototype : breadcrumb + cmd palette stub + actions. */
export default function TopBar({ crumbs, extra }: Props) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "current" : ""}>{c}</span>
          </span>
        ))}
      </div>
      <div className="cmdk">
        <Icon name="search" />
        <span>Interroger Pacemaker…</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-btn has-dot" data-tip="Notifications">
          <Icon name="bell" />
        </button>
        <button className="icon-btn" data-tip="Nouveau">
          <Icon name="plus" />
        </button>
        {extra}
      </div>
    </div>
  );
}
