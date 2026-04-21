import { notFound } from "next/navigation";
import Link from "next/link";
import { getMissionBySlug } from "@/lib/mission";
import { listTranscripts } from "@/lib/plaud";
import Icon from "@/components/prototype/Icon";
import Badge from "@/components/prototype/Badge";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const mission = await getMissionBySlug(slug);
  if (!mission) notFound();

  const transcripts = await listTranscripts(mission.id, 10).catch(() => []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="mono" style={{ color: "var(--muted)", marginBottom: 6 }}>
            CAPTURE RAPIDE · AVANT TRI
          </div>
          <h1 className="page-title">Inbox capture</h1>
          <div className="page-sub">
            Tout ce qui entre avant qu&apos;il ne devienne tâche, décision ou
            incohérence. Plaud est branché ; WhatsApp et chatbot arrivent dans
            les prochaines itérations.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Plaud panel — branché sur la DB */}
        <div className="card">
          <div className="card-head">
            <Icon name="mic" />
            <span className="card-title">Plaud · captations</span>
            <Badge tone="green" dot>
              synchro
            </Badge>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {transcripts.length === 0 && (
              <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
                Aucun transcript ingéré pour cette mission.
                <br />
                <Link href={`/admin/missions/${slug}/plaud`} style={{ color: "var(--ink)", textDecoration: "underline" }}>
                  Coller un transcript →
                </Link>
              </div>
            )}
            {transcripts.map((t, i) => (
              <div
                key={t.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: i === transcripts.length - 1 ? "none" : "1px solid var(--border-soft)",
                }}
              >
                <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      background: "var(--ink)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--paper)",
                    }}
                  >
                    <Icon name="mic" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {t.contextLabel ?? "Transcript Plaud"}
                    </div>
                    <div className="mono" style={{ color: "var(--muted)" }}>
                      {new Date(t.recordedAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {t.durationSeconds ? ` · ${Math.round(t.durationSeconds / 60)} min` : ""}
                      {` · ${t.author}`}
                    </div>
                  </div>
                </div>
                {t.summary && (
                  <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
                    {t.summary.slice(0, 180)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp — placeholder en attente du branchement */}
        <div className="card">
          <div className="card-head">
            <Icon name="wa" />
            <span className="card-title">WhatsApp · allowlist</span>
            <Badge tone="soft">à brancher</Badge>
          </div>
          <div className="card-body">
            <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
              Canal WhatsApp prévu comme input principal (cf. spec
              pacemaker-whatsapp-agent-spec.md). Quand il sera branché,
              les messages entrants arriveront ici avec allowlist, parsing
              et routage vers décisions/tâches/incohérences.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
