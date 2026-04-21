import Link from "next/link";
import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { listIncoherences } from "@/lib/incoherences";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";
import Kpi from "@/components/prototype/Kpi";

export const dynamic = "force-dynamic";

export default async function IncohV2Page({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();
  const incoherences = await listIncoherences(mission.id, { limit: 50 }).catch(
    () => [],
  );

  const pending = incoherences.filter((i) => i.resolutionStatus === "pending");
  const resolved = incoherences.filter(
    (i) => i.resolutionStatus === "auto_resolved" || i.resolutionStatus === "user_acknowledged",
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            QUALITÉ · SIGNAUX FAIBLES
          </div>
          <h1 className="page-title">Incohérences détectées</h1>
          <div className="page-sub">
            Tensions entre ce que Pacemaker lit des sources. Chaque item
            réclame un arbitrage humain (sauf les auto-résolues).
          </div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <Kpi
          label="Ouvertes"
          value={`${pending.length}`}
          sub={`${pending.filter((i) => i.severity === "major").length} majeures`}
          tone={pending.length > 0 ? "alert" : ""}
        />
        <Kpi label="Arbitrées / résolues" value={`${resolved.length}`} />
        <Kpi
          label="Scope drift"
          value={`${incoherences.filter((i) => i.kind === "scope_drift").length}`}
          sub="sur l'ensemble"
        />
        <Kpi
          label="Factual"
          value={`${incoherences.filter((i) => i.kind === "factual").length}`}
          sub="sur l'ensemble"
        />
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {incoherences.length === 0 ? (
            <div style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
              Aucune incohérence détectée jusqu&apos;à présent.
            </div>
          ) : (
            incoherences.map((inc, i) => {
              const tone =
                inc.severity === "major"
                  ? "alert"
                  : inc.severity === "moderate"
                  ? "amber"
                  : "soft";
              const last = i === incoherences.length - 1;
              return (
                <div
                  key={inc.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom: last ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <span className="mono" style={{ color: "var(--muted)" }}>
                      {inc.id.slice(0, 10)}
                    </span>
                    <Badge tone={tone} dot>
                      {inc.severity}
                    </Badge>
                    <Badge tone="soft">{inc.kind}</Badge>
                    {inc.resolutionStatus === "auto_resolved" && (
                      <Badge tone="green" icon="check">
                        résolue
                      </Badge>
                    )}
                    <span
                      className="mono"
                      style={{ marginLeft: "auto", color: "var(--muted)" }}
                    >
                      {inc.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                    {inc.description}
                  </div>
                  {inc.autoResolution && (
                    <div
                      className="row"
                      style={{
                        gap: 8,
                        padding: "8px 10px",
                        background: "var(--accent)",
                        border: "1px solid var(--accent-line)",
                        borderRadius: 6,
                        fontSize: 12.5,
                      }}
                    >
                      <Icon name="sparkle" />
                      <span className="mono" style={{ color: "var(--muted)" }}>
                        Reco Pacemaker
                      </span>
                      <span style={{ flex: 1 }}>{inc.autoResolution}</span>
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, marginTop: 10 }}>
                    <Link
                      href={`/admin/missions/${slug}/v2/decisions`}
                      className="btn btn-primary"
                    >
                      Arbitrer
                    </Link>
                    <span
                      className="mono"
                      style={{ color: "var(--muted)", marginLeft: "auto" }}
                    >
                      source · {inc.sourceEntityType} {inc.sourceEntityId.slice(0, 8)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
