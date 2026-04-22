import SourceIcon from "@/components/prototype/SourceIcon";
import SectionHead from "@/components/prototype/SectionHead";

interface EventRow {
  id: unknown;
  type: unknown;
  label: unknown;
  date: unknown;
  content: unknown;
  week_id: unknown;
}

interface Props {
  events: EventRow[];
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function BriefingJournal({ events }: Props) {
  return (
    <>
      <SectionHead icon="pulse" label="Journal mission" count={events.length} />
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {events.length === 0 && (
            <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
              Aucun evenement capte pour l&apos;instant.
            </div>
          )}
          {events.map((e, i) => {
            const type = String(e.type);
            const srcKind =
              type === "vision"
                ? "photo"
                : type === "upload"
                ? "doc"
                : "plaud";
            return (
              <div
                key={String(e.id)}
                className="row"
                style={{
                  padding: "11px 16px",
                  borderBottom:
                    i === events.length - 1
                      ? "none"
                      : "1px solid var(--border-soft)",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: "var(--paper-sunk)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <SourceIcon kind={srcKind} />
                </span>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                    <span className="mono" style={{ color: "var(--muted)" }}>
                      {type}
                    </span>
                    <span
                      className="mono"
                      style={{ color: "var(--muted-soft)" }}
                    >
                      ·
                    </span>
                    <span
                      style={{ fontSize: 12.5, color: "var(--ink-dim)" }}
                    >
                      S{String(e.week_id ?? "?")}
                    </span>
                    <span
                      className="mono"
                      style={{
                        marginLeft: "auto",
                        color: "var(--muted-soft)",
                      }}
                    >
                      {shortDate(String(e.date ?? ""))}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5 }}>{String(e.label)}</div>
                  {e.content ? (
                    <div
                      className="dim"
                      style={{ fontSize: 12, marginTop: 3 }}
                    >
                      {String(e.content).slice(0, 200)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
