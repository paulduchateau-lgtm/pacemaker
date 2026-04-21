"use client";

import { useState } from "react";
import Icon from "./Icon";
import Badge from "./Badge";
import Confidence from "./Confidence";

export interface DecisionRow {
  id: string;
  date: string;
  author: string;
  conf: number | null;
  status: string;
  confNote: string | null;
  statement: string;
  rationale: string | null;
  alternatives: string[];
  impactsOn: string[];
  source: string | null;
  contradicted: boolean;
}

const MONTHS = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

export default function DecisionNode({
  d,
  first,
  last,
}: {
  d: DecisionRow;
  first?: boolean;
  last?: boolean;
}) {
  const [open, setOpen] = useState(!!first);
  const statusTone: "" | "green" | "amber" | "alert" =
    d.status === "actée" ? "green" : d.status === "proposée" ? "amber" : d.status === "annulée" ? "alert" : "";
  const day = d.date.slice(8, 10);
  const monthIdx = parseInt(d.date.slice(5, 7), 10) - 1;
  const month = MONTHS[monthIdx] ?? d.date.slice(5, 7);

  return (
    <div className="dec-node">
      <div className="dec-rail">
        <div className="dec-dot" data-contradicted={d.contradicted || undefined}>
          {d.contradicted ? <Icon name="incoh" /> : <Icon name="check" />}
        </div>
        {!last && <div className="dec-line" />}
      </div>

      <div className="dec-card">
        <div className="dec-date-col">
          <div className="dec-day">{day}</div>
          <div className="dec-month mono">{month}</div>
        </div>

        <div className="dec-main">
          <div className="row" style={{ marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <span className="mono" style={{ color: "var(--muted)", fontSize: 10.5 }}>
              {d.id.toUpperCase()}
            </span>
            <Badge tone={statusTone} dot={d.status === "proposée"}>
              {d.status}
            </Badge>
            {d.contradicted && (
              <Badge tone="alert" dot>
                contredite
              </Badge>
            )}
            <Confidence value={d.conf} note={d.confNote ?? undefined} />
            <span style={{ marginLeft: "auto" }} className="mono muted">
              par {d.author}
            </span>
          </div>

          <h3 className="dec-title">{d.statement}</h3>

          {!open && (
            <div className="dec-collapsed">
              {d.source && (
                <>
                  <span className="mono muted">Source:</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>
                    {d.source}
                  </span>
                </>
              )}
              <button
                className="btn-link"
                onClick={() => setOpen(true)}
                style={{ marginLeft: "auto", fontSize: 12.5 }}
              >
                Développer <Icon name="chev" />
              </button>
            </div>
          )}

          {open && (
            <div className="dec-expanded">
              {d.rationale && (
                <div className="dec-section">
                  <div className="dec-section-label">
                    <Icon name="sparkle" /> Pourquoi
                  </div>
                  <div className="dec-section-body">{d.rationale}</div>
                </div>
              )}

              {d.alternatives.length > 0 && (
                <div className="dec-section">
                  <div className="dec-section-label">
                    <Icon name="branch" /> Alternatives écartées
                  </div>
                  <div className="dec-section-body">
                    {d.alternatives.map((a, i) => (
                      <div key={i} className="dec-alt">
                        <span className="dec-alt-mark">—</span>
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.impactsOn.length > 0 && (
                <div className="dec-section">
                  <div className="dec-section-label">
                    <Icon name="link" /> Impacts
                  </div>
                  <div className="dec-section-body">
                    <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                      {d.impactsOn.map((im, i) => (
                        <Badge key={i} tone="soft">
                          {im}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {d.source && (
                <div className="dec-section">
                  <div className="dec-section-label">
                    <Icon name="scroll" /> Source
                  </div>
                  <div className="dec-section-body">
                    <div className="dec-source-chip">
                      <Icon name="doc" />
                      <span style={{ fontSize: 12.5 }}>{d.source}</span>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="row gap-2"
                style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}
              >
                <button
                  className="btn-link"
                  onClick={() => setOpen(false)}
                  style={{ marginLeft: "auto", fontSize: 12.5 }}
                >
                  Replier
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
