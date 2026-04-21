import { notFound } from "next/navigation";
import { getMissionBySlug } from "@/lib/mission";
import { query } from "@/lib/db";
import DecisionNode, { type DecisionRow } from "@/components/prototype/DecisionNode";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function safe<T = Row>(sql: string, args: unknown[]): Promise<T[]> {
  try {
    return (await query(sql, args as Parameters<typeof query>[1])) as T[];
  } catch {
    return [];
  }
}

function parseJsonList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const p = JSON.parse(String(raw));
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

export default async function DecisionsV2Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();

  // Décisions + contradictions via decision_links (type supersedes) + incoherences
  // qui référencent une décision comme conflicting_entity.
  const rows = await safe(
    `SELECT id, acted_at, author, confidence, status, rationale_source, statement, rationale, alternatives
     FROM decisions WHERE mission_id = ? ORDER BY acted_at DESC LIMIT 80`,
    [mission.id],
  );

  const incohTargets = await safe(
    `SELECT DISTINCT conflicting_entity_id FROM incoherences
     WHERE mission_id = ? AND conflicting_entity_type = 'decision' AND resolution_status = 'pending'`,
    [mission.id],
  );
  const contradictedSet = new Set(
    incohTargets.map((r) => String(r.conflicting_entity_id)),
  );

  const decisions: DecisionRow[] = rows.map((r) => ({
    id: String(r.id),
    date: String(r.acted_at).slice(0, 10),
    author: String(r.author ?? "paul"),
    conf: r.confidence != null ? Number(r.confidence) : null,
    status: String(r.status),
    confNote:
      r.rationale_source === "llm_inferred"
        ? "extraite par LLM — à confirmer"
        : r.rationale_source === "legacy_no_rationale"
        ? "décision legacy sans motif"
        : null,
    statement: String(r.statement),
    rationale: (r.rationale as string | null) ?? null,
    alternatives: parseJsonList(r.alternatives),
    impactsOn: [], // nécessiterait un JOIN decision_links — V2
    source: null,
    contradicted: contradictedSet.has(String(r.id)),
  }));

  const counts = {
    all: decisions.length,
    acted: decisions.filter((d) => d.status === "actée").length,
    proposed: decisions.filter((d) => d.status === "proposée").length,
    contradicted: decisions.filter((d) => d.contradicted).length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            JOURNAL TRAÇABLE · CHAQUE DÉCISION A UNE SOURCE
          </div>
          <h1 className="page-title">Décisions</h1>
          <div className="page-sub">
            Ce qui a été décidé, par qui, pourquoi. Pacemaker détecte les
            contradictions via les incohérences signalées.
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 28 }}>
        <div className="tab active">
          Toutes<span className="count">{counts.all}</span>
        </div>
        <div className="tab">
          Actées<span className="count">{counts.acted}</span>
        </div>
        <div className="tab">
          Proposées<span className="count">{counts.proposed}</span>
        </div>
        <div className="tab alert">
          Contredites<span className="count">{counts.contradicted}</span>
        </div>
      </div>

      {decisions.length === 0 ? (
        <div
          className="card"
          style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}
        >
          Aucune décision enregistrée pour cette mission.
        </div>
      ) : (
        <div className="dec-timeline">
          {decisions.map((d, i) => (
            <DecisionNode
              key={d.id}
              d={d}
              first={i === 0}
              last={i === decisions.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
