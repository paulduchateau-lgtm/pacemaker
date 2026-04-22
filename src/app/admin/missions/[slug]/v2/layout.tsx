import "@/styles/prototype.css";
import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import Sidebar from "@/components/prototype/Sidebar";
import TopBar from "@/components/prototype/TopBar";
import CopilotConsole from "@/components/prototype/CopilotConsole";

interface Params {
  slug: string;
}

async function fetchCounts(missionId: string) {
  const safe = async (sql: string, args: unknown[]): Promise<Array<Record<string, unknown>>> => {
    try {
      return (await query(sql, args as Parameters<typeof query>[1])) as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  };
  const [tasksRows, livrablesRows, decisionsRows, incohRows, docsRows, plaudRows] =
    await Promise.all([
      safe(`SELECT COUNT(*) as c FROM tasks WHERE mission_id = ? AND status != 'fait'`, [missionId]),
      safe(`SELECT COUNT(*) as c FROM livrables WHERE mission_id = ?`, [missionId]),
      safe(`SELECT COUNT(*) as c FROM decisions WHERE mission_id = ?`, [missionId]),
      safe(`SELECT COUNT(*) as c FROM incoherences WHERE mission_id = ? AND resolution_status = 'pending'`, [missionId]),
      safe(`SELECT COUNT(*) as c FROM documents WHERE mission_id = ?`, [missionId]),
      safe(`SELECT COUNT(*) as c FROM plaud_transcripts WHERE mission_id = ?`, [missionId]),
    ]);
  return {
    tasks: Number(tasksRows[0]?.c ?? 0),
    livrables: Number(livrablesRows[0]?.c ?? 0),
    decisions: Number(decisionsRows[0]?.c ?? 0),
    incoh: Number(incohRows[0]?.c ?? 0),
    sources: Number(docsRows[0]?.c ?? 0),
    inbox: Number(plaudRows[0]?.c ?? 0),
  };
}

export default async function V2Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug).catch(() => null);
  if (!mission) notFound();
  const counts = await fetchCounts(mission.id);

  const client = mission.client ?? mission.label;

  // Wrapper fixed plein écran pour échapper au <main max-w-4xl mx-auto>
  // du layout v1 parent. Sinon le shell v2 serait centré dans 896px max,
  // d'où les marges beiges visibles autour de la sidebar.
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--paper)",
        overflow: "auto",
        zIndex: 10,
      }}
    >
      <div className="app-shell">
        <Sidebar
          slug={slug}
          mission={{ client: client + " · " + (mission.label ?? ""), label: mission.label ?? "" }}
          counts={counts}
        />
        <main className="main-col">
          <TopBar crumbs={["Pacemaker", mission.label ?? "Mission"]} />
          <div className="main-body">{children}</div>
        </main>
        <CopilotConsole />
      </div>
    </div>
  );
}
