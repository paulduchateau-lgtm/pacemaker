import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import Kpi from "@/components/prototype/Kpi";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function safe<T = Row>(sql: string, args: unknown[]): Promise<T[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as T[];
  } catch {
    return [];
  }
}

export default async function TempsLiberePage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();

  const rows = await safe(
    `SELECT activity_type, SUM(estimated_minutes_saved) as minutes, COUNT(*) as occurrences
     FROM time_savings WHERE mission_id = ? GROUP BY activity_type
     ORDER BY minutes DESC`,
    [mission.id],
  );

  const totalMin = rows.reduce((acc, r) => acc + Number(r.minutes ?? 0), 0);
  const totalHours = totalMin / 60;
  const jhEquiv = totalHours / 7; // 7h = 1 jh
  const jhSold = 60;
  const jhReel = 30;

  const labels: Record<string, string> = {
    recalibration_manual: "Recalibrations manuelles",
    recalibration_auto: "Recalibrations auto",
    doc_indexed_rag: "Indexation documents RAG",
    cr_parsing: "Parsing de compte-rendus",
    incoherence_flagged: "Détection d'incohérences",
    task_creation_llm: "Génération de tâches",
    briefing_cache_hit: "Briefings adaptatifs",
    plaud_ingested: "Ingestion Plaud",
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            Principe 7 — l&apos;unité de mesure
          </div>
          <h1 className="page-title">Temps libéré</h1>
          <div className="page-sub">
            Ce que Pacemaker a absorbé pour que tu te concentres sur la valeur
            ajoutée senior.
          </div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <Kpi
          label="Heures libérées"
          value={`${totalHours.toFixed(1)}h`}
          sub={`depuis kick-off · ${rows.reduce((a, r) => a + Number(r.occurrences ?? 0), 0)} activités`}
        />
        <Kpi
          label="JH équivalent"
          value={jhEquiv.toFixed(1)}
          sub={`sur ${jhReel} budget réel`}
        />
        <Kpi
          label="Valeur client"
          value={`+${Math.round((jhEquiv / jhReel) * 100)}%`}
          sub="densité senior"
        />
        <Kpi
          label="ROI Pacemaker"
          value={`×${(jhEquiv * 600).toFixed(1).replace(".0", "")}`}
          sub={`vs coût SaaS mission (${jhSold}jh vendus)`}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Répartition par type d&apos;absorption</span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>
            {totalMin > 0 ? `${totalMin} minutes agrégées` : "aucune donnée"}
          </span>
        </div>
        <div className="card-body">
          {rows.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              Aucune activité traçée pour l&apos;instant. Les appels LLM
              (recalibrations, parsing, génération) alimentent cette page
              automatiquement.
            </p>
          )}
          <div className="stack" style={{ gap: 10 }}>
            {rows.map((r) => {
              const min = Number(r.minutes ?? 0);
              const pct = totalMin > 0 ? (min / totalMin) * 100 : 0;
              const key = String(r.activity_type);
              return (
                <div key={key}>
                  <div className="row" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{labels[key] ?? key}</span>
                    <span
                      className="mono"
                      style={{ marginLeft: "auto", color: "var(--muted)" }}
                    >
                      {min > 60 ? `${Math.floor(min / 60)}h ${min % 60}` : `${min}min`} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress">
                    <span
                      style={{
                        width: `${pct}%`,
                        background: "var(--green)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
