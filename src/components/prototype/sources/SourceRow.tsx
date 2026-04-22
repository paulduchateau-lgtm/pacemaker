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
  return (
    <div
      className={"src-row" + (active ? " active" : "")}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="src-row-icon">
        <SourceIcon kind={s.kind} />
      </div>
      <div className="src-row-body">
        <div className="src-row-title">{s.title}</div>
        <div className="src-row-meta">
          <span className="mono muted">{s.fmt}</span>
          <span className="mono muted">· {s.uploaded.slice(0, 10)}</span>
          <span className={"fresh " + s.freshness}>
            <span className="d" />
          </span>
        </div>
      </div>
      <div className="src-row-used mono muted">{s.used}×</div>
    </div>
  );
}
