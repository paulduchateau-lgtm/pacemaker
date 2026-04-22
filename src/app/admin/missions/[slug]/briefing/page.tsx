import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import StatTile from "@/components/prototype/StatTile";
import BriefingArbitrages from "@/components/prototype/briefing/BriefingArbitrages";
import BriefingJournal from "@/components/prototype/briefing/BriefingJournal";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function safe<T = Row>(sql: string, args: unknown[]): Promise<T[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as T[];
  } catch {
    return [];
  }
}

async function fetchBriefing(missionId: string) {
  const [taskStats, risks, incohs, events, recentRecalib] = await Promise.all([
    safe(`SELECT status, COUNT(*) as c FROM tasks WHERE mission_id = ? GROUP BY status`, [missionId]),
    safe(`SELECT COUNT(*) as c FROM risks WHERE mission_id = ? AND status = 'actif'`, [missionId]),
    safe(`SELECT id, kind, severity, description, auto_resolution, source_entity_type, created_at FROM incoherences WHERE mission_id = ? AND resolution_status = 'pending' ORDER BY created_at DESC LIMIT 6`, [missionId]),
    safe(`SELECT id, type, label, date, content, week_id FROM events WHERE mission_id = ? ORDER BY date DESC LIMIT 100`, [missionId]),
    safe(`SELECT MAX(created_at) as last FROM recalibrations WHERE mission_id = ?`, [missionId]),
  ]);
  const taskMap: Record<string, number> = {};
  for (const t of taskStats) taskMap[String(t.status)] = Number(t.c ?? 0);
  const openCount = Object.entries(taskMap)
    .filter(([k]) => k !== "fait")
    .reduce((acc, [, v]) => acc + v, 0);
  return {
    tasks: { open: openCount, blocked: taskMap["bloque"] ?? 0 },
    risksActive: Number(risks[0]?.c ?? 0),
    incohs,
    events,
    lastRecalib: (recentRecalib[0]?.last as string | null) ?? null,
  };
}

function daysLeft(endIso: string): string {
  const d = Math.max(0, Math.round((new Date(endIso).getTime() - Date.now()) / (24 * 3600 * 1000)));
  return `${d}j`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
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

  return (
    <div className="page briefing">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            BRIEFING · {mission.label}
          </div>
          <h1 className="page-title">Briefing</h1>
          <div className="page-sub">
            L&apos;essentiel depuis ta derniere visite.
          </div>
        </div>
        <div className="row gap-2">
          <a href={`/admin/missions/${slug}/plan`} className="btn btn-ghost">
            Voir le plan
          </a>
          <a href={`/admin/missions/${slug}/signaux`} className="btn btn-ghost">
            ! Signaux
          </a>
        </div>
      </div>

      <div className="stat-strip">
        <StatTile
          icon="calendar"
          value={mission.endDate ? daysLeft(mission.endDate) : "—"}
          label="jours restants"
          sub={mission.endDate ? `fin ${shortDate(mission.endDate)}` : ""}
        />
        <StatTile
          icon="clock"
          value={`${b.tasks.open}`}
          label="taches actives"
          sub={`${b.tasks.blocked} bloquees`}
          tone={b.tasks.blocked > 0 ? "amber" : "neutral"}
        />
        <StatTile
          icon="incoh"
          value={`${b.incohs.length}`}
          label="a arbitrer"
          sub={b.incohs.length > 0 ? "cf. section ci-dessous" : "rien de pending"}
          tone={b.incohs.length > 0 ? "alert" : "neutral"}
        />
        <StatTile icon="flag" value={`${b.risksActive}`} label="risques actifs" />
        <StatTile
          icon="sparkle"
          value={b.lastRecalib ? shortDate(b.lastRecalib) : "—"}
          label="derniere recalib"
          tone="green"
        />
      </div>

      <BriefingArbitrages incohs={b.incohs} slug={slug} />
      <BriefingJournal events={b.events} />
    </div>
  );
}
