import Link from "next/link";
import Icon from "./Icon";
import Badge from "./Badge";
import type { Incoherence } from "@/lib/incoherences";

export default function IncoherencesList({
  incoherences,
  slug,
}: {
  incoherences: Incoherence[];
  slug: string;
}) {
  return (
    <div className="card">
      <div className="card-body" style={{ padding: 0 }}>
        {incoherences.length === 0 ? (
          <div style={{ padding: 24, color: "var(--muted)", textAlign: "center" }}>
            Aucune incohérence détectée jusqu&apos;à présent.
          </div>
        ) : (
          incoherences.map((inc, i) => {
            const tone =
              inc.severity === "major" ? "alert" : inc.severity === "moderate" ? "amber" : "soft";
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
                  <Badge tone={tone} dot>{inc.severity}</Badge>
                  <Badge tone="soft">{inc.kind}</Badge>
                  {inc.resolutionStatus === "auto_resolved" && (
                    <Badge tone="green" icon="check">résolue</Badge>
                  )}
                  <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>
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
                    <span className="mono" style={{ color: "var(--muted)" }}>Reco Pacemaker</span>
                    <span style={{ flex: 1 }}>{inc.autoResolution}</span>
                  </div>
                )}
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <Link href={`/admin/missions/${slug}/v2/decisions`} className="btn btn-primary">
                    Arbitrer
                  </Link>
                  <span className="mono" style={{ color: "var(--muted)", marginLeft: "auto" }}>
                    source · {inc.sourceEntityType} {inc.sourceEntityId.slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
