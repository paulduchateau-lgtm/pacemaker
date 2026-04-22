import Link from "next/link";
import Icon from "@/components/prototype/Icon";
import Confidence from "@/components/prototype/Confidence";
import SectionHead from "@/components/prototype/SectionHead";

interface IncoherenceRow {
  id: unknown;
  severity: unknown;
  description: unknown;
  auto_resolution: unknown;
  source_entity_type: unknown;
}

interface Props {
  incohs: IncoherenceRow[];
  slug: string;
}

export default function BriefingArbitrages({ incohs, slug }: Props) {
  if (incohs.length === 0) return null;

  return (
    <>
      <SectionHead icon="incoh" label="A arbitrer" count={incohs.length} tone="alert" />
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {incohs.map((i, idx) => {
            const severity = String(i.severity);
            const tone =
              severity === "major"
                ? "alert"
                : severity === "moderate"
                ? "amber"
                : "muted";
            const srcLabel =
              (i.source_entity_type as string | null) ?? "inconnu";
            return (
              <div
                key={String(i.id)}
                className={
                  "arb-row" + (idx === incohs.length - 1 ? " last" : "")
                }
              >
                <span className={"arb-dot tone-" + tone} />
                <div className="arb-main">
                  <div className="arb-title">
                    {String(i.description).slice(0, 80)}
                  </div>
                  <div className="arb-body">
                    {String(
                      i.auto_resolution ??
                        "Pas de resolution auto — arbitrage humain requis.",
                    )}
                  </div>
                  <div className="arb-meta">
                    <span className={"arb-pill tone-" + tone}>{severity}</span>
                    <span className="arb-src">
                      <Icon name="sources" className="sm" /> source : {srcLabel}
                    </span>
                    <Confidence value={null} />
                  </div>
                </div>
                <div className="arb-actions">
                  <Link
                    href={`/admin/missions/${slug}/signaux`}
                    className="btn btn-primary"
                  >
                    Arbitrer
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
