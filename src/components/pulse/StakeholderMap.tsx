"use client";

import { useState } from "react";
import type { Stakeholder } from "@/lib/pulse";

interface Props {
  stakeholders: Stakeholder[];
}

function satColor(sat: number): string {
  if (sat > 0.7) return "var(--color-green, #A5D900)";
  if (sat >= 0.5) return "#C4872E";
  return "var(--color-alert, #D95B2F)";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Layout orbital : l'équipe mission au centre (déterminé par role contenant
 * "équipe"/"mission"/"lite"), les stakeholders en couronne autour. Taille du
 * cercle proportionnelle au nombre d'interactions, couleur = satisfaction.
 */
export default function StakeholderMap({ stakeholders }: Props) {
  const [focus, setFocus] = useState<string | null>(null);

  if (stakeholders.length === 0) {
    return (
      <div
        className="p-4 text-center"
        style={{ color: "var(--color-muted)", fontSize: 13 }}
      >
        Aucun stakeholder capté pour l&apos;instant. Ingère des transcripts Plaud
        mentionnant des subjects (client, paul, paul_b…) pour peupler cette vue.
      </div>
    );
  }

  const team = stakeholders.filter((s) =>
    /équipe|mission|lite/i.test(s.role),
  );
  const ring = stakeholders.filter((s) => !team.includes(s));
  const teamNode = team[0] ?? stakeholders[0];
  const ringNodes = team.length > 0 ? ring : stakeholders.slice(1);

  const maxInter = Math.max(...stakeholders.map((s) => s.interactions), 1);
  const radiusFor = (s: Stakeholder) => {
    const base = 22;
    const bonus = (s.interactions / maxInter) * 16;
    return base + bonus;
  };

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1.4",
        background: "var(--color-paper, #F0EEEB)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Cercles concentriques indicatifs */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <circle
          cx="50"
          cy="50"
          r="22"
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="0.4 1"
          strokeWidth="0.2"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="0.4 1"
          strokeWidth="0.2"
        />
      </svg>

      {/* Liens équipe → stakeholder (une ligne par lien) */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {ringNodes.map((s, i) => {
          const angle = (i / ringNodes.length) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + 36 * Math.cos(angle);
          const y = 50 + 36 * Math.sin(angle);
          const opacity = focus && focus !== s.id ? 0.15 : 0.5;
          return (
            <line
              key={s.id}
              x1={50}
              y1={50}
              x2={x}
              y2={y}
              stroke="var(--color-muted)"
              strokeWidth="0.3"
              strokeDasharray={s.interactions < 2 ? "0.8 1.2" : "none"}
              opacity={opacity}
            />
          );
        })}
      </svg>

      {/* Nœud équipe au centre */}
      {teamNode && (
        <StakeholderNode
          s={teamNode}
          x={50}
          y={50}
          size={radiusFor(teamNode) * 2}
          isTeam
          focus={focus}
          setFocus={setFocus}
        />
      )}

      {/* Nœuds stakeholders en couronne */}
      {ringNodes.map((s, i) => {
        const angle = (i / ringNodes.length) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 36 * Math.cos(angle);
        const y = 50 + 36 * Math.sin(angle);
        return (
          <StakeholderNode
            key={s.id}
            s={s}
            x={x}
            y={y}
            size={radiusFor(s) * 2}
            isTeam={false}
            focus={focus}
            setFocus={setFocus}
          />
        );
      })}
    </div>
  );
}

function StakeholderNode({
  s,
  x,
  y,
  size,
  isTeam,
  focus,
  setFocus,
}: {
  s: Stakeholder;
  x: number;
  y: number;
  size: number;
  isTeam: boolean;
  focus: string | null;
  setFocus: (id: string | null) => void;
}) {
  const dim = focus !== null && focus !== s.id;
  const isFocus = focus === s.id;
  const color = satColor(s.sat);
  const trend = s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setFocus(s.id)}
      onMouseLeave={() => setFocus(null)}
      onFocus={() => setFocus(s.id)}
      onBlur={() => setFocus(null)}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: dim ? 0.35 : 1,
        transition: "opacity 150ms",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: color,
          border: isTeam ? "2px solid var(--color-ink)" : "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: Math.max(10, size * 0.28),
          color: color === "var(--color-alert, #D95B2F)" ? "#FFFFFF" : "var(--color-ink)",
          boxShadow: isFocus ? "0 0 0 3px rgba(165,217,0,0.35)" : "none",
          transition: "box-shadow 150ms",
        }}
      >
        {initials(s.name)}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          whiteSpace: "nowrap",
          textAlign: "center",
          fontSize: 11,
          color: "var(--color-ink)",
          lineHeight: 1.3,
        }}
      >
        <div style={{ fontWeight: 500 }}>
          {s.name} {trend && <span style={{ color }}>{trend}</span>}
        </div>
        <div className="mono-label" style={{ color: "var(--color-muted)" }}>
          {(isTeam ? "ÉQUIPE · " : "") + s.role.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
