"use client";

import Icon from "./Icon";

export interface RoadmapWeek {
  id: number;
  phase: string;
  title: string;
  budget: number;
  jhUsed: number;
  status: "fait" | "en cours" | "à venir";
  startIso: string | null;
  endIso: string | null;
}

export interface Phase {
  name: string;
  color: string;
  weeks: RoadmapWeek[];
  budget: number;
  used: number;
  status: "fait" | "en cours" | "à venir";
}

const PHASE_COLOR: Record<string, string> = {
  Cadrage: "var(--green)",
  "Construction socle": "var(--green-deep)",
  Développement: "var(--sky)",
  Stabilisation: "var(--amber)",
  Transfert: "var(--alert)",
};

function buildPhases(weeks: RoadmapWeek[]): Phase[] {
  const seen: Record<string, Phase> = {};
  const phases: Phase[] = [];
  for (const w of weeks) {
    if (!seen[w.phase]) {
      seen[w.phase] = {
        name: w.phase,
        color: PHASE_COLOR[w.phase] ?? "var(--ink)",
        weeks: [],
        budget: 0,
        used: 0,
        status: "à venir",
      };
      phases.push(seen[w.phase]);
    }
    seen[w.phase].weeks.push(w);
    seen[w.phase].budget += w.budget;
    seen[w.phase].used += w.jhUsed;
  }
  for (const p of phases) {
    p.status = p.weeks.every((w) => w.status === "fait")
      ? "fait"
      : p.weeks.some((w) => w.status === "en cours")
      ? "en cours"
      : "à venir";
  }
  return phases;
}

interface Props {
  weeks: RoadmapWeek[];
  currentWeek: number;
}

export default function PhaseRoadmap({ weeks, currentWeek }: Props) {
  if (weeks.length === 0) return null;
  const phases = buildPhases(weeks);
  const WEEK_COUNT = weeks.length;

  return (
    <div className="card phase-roadmap">
      <div className="card-body" style={{ padding: "16px 18px 10px" }}>
        <div className="roadmap-axis">
          {weeks.map((w, i) => {
            const dateStr = w.startIso
              ? new Date(w.startIso).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              : "";
            return (
              <div
                key={w.id}
                className={"roadmap-col" + (i + 1 === currentWeek ? " now" : "")}
              >
                <div className="roadmap-col-num">S{w.id}</div>
                <div className="roadmap-col-date">{dateStr}</div>
              </div>
            );
          })}
        </div>

        <div className="roadmap-tracks">
          <div className="roadmap-grid">
            {weeks.map((_, i) => (
              <div
                key={i}
                className={"roadmap-gridcol" + (i + 1 === currentWeek ? " now" : "")}
              />
            ))}
          </div>

          <div
            className="roadmap-today"
            style={{ left: `calc(164px + (100% - 164px) * ${(currentWeek - 0.5) / WEEK_COUNT})` }}
          >
            <div className="roadmap-today-label">AUJ</div>
          </div>

          {phases.map((p) => {
            const startW = p.weeks[0].id;
            const endW = p.weeks[p.weeks.length - 1].id;
            const left = ((startW - 1) / WEEK_COUNT) * 100;
            const width = ((endW - startW + 1) / WEEK_COUNT) * 100;
            const progress = p.budget ? Math.min(100, (p.used / p.budget) * 100) : 0;
            return (
              <div key={p.name} className="roadmap-row">
                <div className="roadmap-row-label">
                  <span className="phase-dot" style={{ background: p.color }} />
                  <span className="phase-name">{p.name}</span>
                </div>
                <div className="roadmap-row-track">
                  <div
                    className={"roadmap-bar status-" + p.status.replace(/\s/g, "-")}
                    style={
                      {
                        left: `${left}%`,
                        width: `${width}%`,
                        "--phase-color": p.color,
                      } as React.CSSProperties
                    }
                  >
                    <div className="roadmap-bar-fill" style={{ width: `${progress}%` }} />
                    <div className="roadmap-bar-content">
                      {p.status === "fait" && <Icon name="check" className="sm" />}
                      {p.status === "en cours" && <span className="pulse-dot" />}
                      <span className="roadmap-bar-meta">
                        {p.used.toFixed(1)}/{p.budget} jh
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
