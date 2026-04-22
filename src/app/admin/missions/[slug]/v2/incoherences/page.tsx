import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { listIncoherences } from "@/lib/incoherences";
import { query } from "@/lib/db";
import Kpi from "@/components/prototype/Kpi";
import SectionHead from "@/components/prototype/SectionHead";
import IncoherencesList from "@/components/prototype/IncoherencesList";
import RisksList, { type RiskRow } from "@/components/prototype/RisksList";

export const dynamic = "force-dynamic";

async function fetchRisks(missionId: string): Promise<RiskRow[]> {
  try {
    const rows = (await query(
      `SELECT id, label, impact, probability, status, mitigation FROM risks WHERE mission_id = ? ORDER BY (impact * probability) DESC`,
      [missionId],
    )) as unknown as RiskRow[];
    return rows;
  } catch {
    return [];
  }
}

export default async function IncohV2Page({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();
  const [incoherences, risks] = await Promise.all([
    listIncoherences(mission.id, { limit: 50 }).catch(() => []),
    fetchRisks(mission.id),
  ]);

  const pending = incoherences.filter((i) => i.resolutionStatus === "pending");
  const resolved = incoherences.filter(
    (i) => i.resolutionStatus === "auto_resolved" || i.resolutionStatus === "user_acknowledged",
  );
  const activeRisks = risks.filter((r) => r.status === "actif");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            QUALITÉ · SIGNAUX FAIBLES
          </div>
          <h1 className="page-title">Incohérences &amp; risques</h1>
          <div className="page-sub">
            Tensions entre ce que Pacemaker lit des sources et risques identifiés sur la mission.
          </div>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 14 }}>
        <Kpi
          label="Incoh. ouvertes"
          value={`${pending.length}`}
          sub={`${pending.filter((i) => i.severity === "major").length} majeures`}
          tone={pending.length > 0 ? "alert" : ""}
        />
        <Kpi label="Arbitrées" value={`${resolved.length}`} />
        <Kpi
          label="Risques actifs"
          value={`${activeRisks.length}`}
          sub={`${risks.length} au total`}
          tone={activeRisks.length > 0 ? "amber" : ""}
        />
        <Kpi
          label="Scope drift"
          value={`${incoherences.filter((i) => i.kind === "scope_drift").length}`}
          sub="incohérences"
        />
      </div>

      <SectionHead icon="incoh" label="Incohérences détectées" count={incoherences.length} />
      <IncoherencesList incoherences={incoherences} slug={slug} />

      <div style={{ marginTop: 28 }}>
        <SectionHead icon="risks" label="Risques de la mission" count={risks.length} />
        <RisksList risks={risks} />
      </div>
    </div>
  );
}
