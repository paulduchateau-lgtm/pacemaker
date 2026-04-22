"use client";

import SourceIcon from "@/components/prototype/SourceIcon";
import type { Source } from "./source-types";

export default function SourceRow({
  s,
  active,
  onClick,
}: {
  s: Source;
  active: boolean;
  onClick: () => void;
}) {
  const obsolete = s.status === "obsolete";
  return (
    <div
      className={"src-row" + (active ? " active" : "")}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={obsolete ? { opacity: 0.45 } : undefined}
    >
      <div className="src-row-icon">
        <SourceIcon kind={s.kind} />
      </div>
      <div className="src-row-body">
        <div className="src-row-title" style={obsolete ? { textDecoration: "line-through" } : undefined}>
          {s.title}
        </div>
        <div className="src-row-meta">
          {obsolete ? (
            <span className="mono" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.12em" }}>
              OBSOLETE
            </span>
          ) : (
            <>
              <span className="mono muted">{s.fmt}</span>
              <span className="mono muted">· {s.uploaded.slice(0, 10)}</span>
              <span className={"fresh " + s.freshness}><span className="d" /></span>
            </>
          )}
        </div>
      </div>
      {!obsolete && <div className="src-row-used mono muted">{s.used}×</div>}
    </div>
  );
}
