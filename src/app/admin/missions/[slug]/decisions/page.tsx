import { listDecisions } from "@/lib/decisions";
import { requireMissionBySlug } from "@/lib/mission";
import DecisionCard from "@/components/decisions/DecisionCard";
import DecisionForm from "@/components/decisions/DecisionForm";

export const dynamic = "force-dynamic";

export default async function DecisionsPage({
  params,
}: {
  params: { slug: string };
}) {
  const mission = await requireMissionBySlug(params.slug);
  const decisions = await listDecisions(mission.id, {
    statuses: ["proposée", "actée", "révisée"],
  });
  const cancelled = await listDecisions(mission.id, { statuses: ["annulée"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium" style={{ color: "var(--color-ink)" }}>
          Décisions
        </h1>
        <p className="mono-label mt-1" style={{ color: "var(--color-muted)" }}>
          {decisions.length} actives · {cancelled.length} annulées
        </p>
      </div>

      <section>
        <h2 className="mono-label mb-2" style={{ color: "var(--color-muted)" }}>
          NOUVELLE DÉCISION
        </h2>
        <DecisionForm missionSlug={mission.slug} />
      </section>

      <section className="space-y-3">
        <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
          ACTIVES
        </h2>
        {decisions.length === 0 ? (
          <div
            className="p-6 text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-muted)",
            }}
          >
            Aucune décision consignée pour l&apos;instant. Chaque décision majeure
            laisse ici une trace argumentée.
          </div>
        ) : (
          decisions.map((d) => <DecisionCard key={d.id} decision={d} />)
        )}
      </section>

      {cancelled.length > 0 && (
        <section className="space-y-3">
          <h2 className="mono-label" style={{ color: "var(--color-muted)" }}>
            ANNULÉES
          </h2>
          {cancelled.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </section>
      )}
    </div>
  );
}
