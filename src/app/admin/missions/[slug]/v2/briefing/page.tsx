import Link from "next/link";
import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import Icon from "@/components/prototype/Icon";
import StatTile from "@/components/prototype/StatTile";
import SectionHead from "@/components/prototype/SectionHead";
import Confidence from "@/components/prototype/Confidence";
import SourceIcon from "@/components/prototype/SourceIcon";

export const dynamic = "force-dynamic";

interface Row {
  [k: string]: unknown;
}

async function safe<T = Row>(sql: string, args: unknown[]): Promise<T[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as T[];
  } catch {
    return [];
  }
}

async function fetchBriefing(missionId: string) {
  const [taskStats, risks, incohs, events, recentRecalib] = await Promise.all([
    safe(
      `SELECT status, COUNT(*) as c FROM tasks WHERE mission_id = ? GROUP BY status`,
      [missionId],
    ),
    safe(
      `SELECT COUNT(*) as c FROM risks WHERE mission_id = ? AND status = 'actif'`,
      [missionId],
    ),
    safe(
      `SELECT id, kind, severity, description, auto_resolution, source_entity_type, created_at FROM incoherences
       WHERE mission_id = ? AND resolution_status = 'pending' ORDER BY created_at DESC LIMIT 6`,
      [missionId],
    ),
    safe(
      `SELECT id, type, label, date, content, week_id FROM events
       WHERE mission_id = ? ORDER BY date DESC LIMIT 100`,
      [missionId],
    ),
    safe(
      `SELECT MAX(created_at) as last FROM recalibrations WHERE mission_id = ?`,
      [missionId],
    ),
  ]);
  const taskMap: Record<string, number> = {};
  for (const t of taskStats) taskMap[String(t.status)] = Number(t.c ?? 0);
  const openCount = Object.entries(taskMap)
    .filter(([k]) => k !== "fait")
    .reduce((acc, [, v]) => acc + v, 0);

  return {
    tasks: { open: openCount, blocked: taskMap["bloqué"] ?? 0 },
    risksActive: Number(risks[0]?.c ?? 0),
    incohs,
    events,
    lastRecalib: (recentRecalib[0]?.last as string | null) ?? null,
  };
}

export default async function BriefingPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();
  const b = await fetchBriefing(mission.id);

  const incohsCount = b.incohs.length;

  return (
    <div className="page briefing">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            BRIEFING · {mission.label}
          </div>
          <h1 className="page-title">Briefing</h1>
          <div className="page-sub">
            L&apos;essentiel depuis ta dernière visite. Pacemaker a déjà arbitré
            ce qu&apos;il pouvait, et met en évidence ce qui réclame ton regard.
          </div>
        </div>
        <div className="row gap-2">
          <Link href={`/admin/missions/${slug}/v2/plan`} className="btn btn-ghost">
            <Icon name="eye" /> Plan
          </Link>
          <Link href={`/admin/missions/${slug}/v2/pulse`} className="btn btn-accent">
            <Icon name="sparkle" /> Pulse
          </Link>
        </div>
      </div>

      <div className="stat-strip">
        <StatTile icon="calendar" value={mission.endDate ? daysLeft(mission.endDate) : "—"} label="jours restants" sub={mission.endDate ? `fin ${shortDate(mission.endDate)}` : ""} />
        <StatTile icon="clock" value={`${b.tasks.open}`} label="tâches actives" sub={`${b.tasks.blocked} bloquées`} tone={b.tasks.blocked > 0 ? "amber" : "neutral"} />
        <StatTile icon="incoh" value={`${incohsCount}`} label="à arbitrer" sub={incohsCount > 0 ? "cf. section ci-dessous" : "rien de pending"} tone={incohsCount > 0 ? "alert" : "neutral"} />
        <StatTile icon="flag" value={`${b.risksActive}`} label="risques actifs" />
        <StatTile icon="sparkle" value={b.lastRecalib ? shortDate(b.lastRecalib) : "—"} label="dernière recalib" tone="green" />
      </div>

      {incohsCount > 0 && (
        <>
          <SectionHead icon="incoh" label="À arbitrer" count={incohsCount} tone="alert" />
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {b.incohs.map((i, idx) => {
                const severity = String(i.severity);
                const tone = severity === "major" ? "alert" : severity === "moderate" ? "amber" : "muted";
                const srcLabel = (i.source_entity_type as string | null) ?? "inconnu";
                return (
                  <div key={String(i.id)} className={"arb-row" + (idx === b.incohs.length - 1 ? " last" : "")}>
                    <span className={"arb-dot tone-" + tone} />
                    <div className="arb-main">
                      <div className="arb-title">{String(i.description).slice(0, 80)}</div>
                      <div className="arb-body">{String(i.auto_resolution ?? "Pas de résolution auto — arbitrage humain requis.")}</div>
                      <div className="arb-meta">
                        <span className={"arb-pill tone-" + tone}>{severity}</span>
                        <span className="arb-src">
                          <Icon name="sources" className="sm" /> source : {srcLabel}
                        </span>
                        <Confidence value={null} />
                      </div>
                    </div>
                    <div className="arb-actions">
                      <Link href={`/admin/missions/${slug}/v2/incoherences`} className="btn btn-primary">
                        Arbitrer
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <SectionHead icon="pulse" label="Journal mission" count={b.events.length} />
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {b.events.length === 0 && (
            <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
              Aucun événement capté pour l&apos;instant.
            </div>
          )}
          {b.events.map((e, i) => {
            const type = String(e.type);
            const icon = type === "vision" ? "camera" : type === "upload" ? "doc" : type === "decision" ? "gavel" : type === "recalib" ? "sparkle" : "pulse";
            return (
              <div
                key={String(e.id)}
                className="row"
                style={{
                  padding: "11px 16px",
                  borderBottom: i === b.events.length - 1 ? "none" : "1px solid var(--border-soft)",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: "var(--paper-sunk)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <SourceIcon kind={icon === "doc" ? "doc" : icon === "camera" ? "photo" : "plaud"} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                    <span className="mono" style={{ color: "var(--muted)" }}>{type}</span>
                    <span className="mono" style={{ color: "var(--muted-soft)" }}>·</span>
                    <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>
                      S{String(e.week_id ?? "?")}
                    </span>
                    <span className="mono" style={{ marginLeft: "auto", color: "var(--muted-soft)" }}>
                      {shortDate(String(e.date ?? ""))}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5 }}>{String(e.label)}</div>
                  {e.content ? (
                    <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>
                      {String(e.content).slice(0, 200)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function daysLeft(endIso: string): string {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  const d = Math.max(0, Math.round((end - now) / (24 * 3600 * 1000)));
  return `${d}j`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
