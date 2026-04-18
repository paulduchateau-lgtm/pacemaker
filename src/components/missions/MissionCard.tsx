import Link from "next/link";
import type { Mission } from "@/types";

const STATUS_COLORS: Record<Mission["status"], string> = {
  active: "var(--color-green)",
  paused: "var(--color-amber)",
  archived: "var(--color-muted)",
};

const STATUS_LABELS: Record<Mission["status"], string> = {
  active: "ACTIVE",
  paused: "EN PAUSE",
  archived: "ARCHIVÉE",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function MissionCard({ mission }: { mission: Mission }) {
  const href = `/admin/missions/${mission.slug}`;
  return (
    <Link
      href={href}
      className="block p-4 transition-colors"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-base" style={{ color: "var(--color-ink)" }}>
            {mission.label}
          </div>
          {mission.client && (
            <div
              className="mono-label mt-1"
              style={{ color: "var(--color-muted)" }}
            >
              {mission.client}
            </div>
          )}
        </div>
        <span
          className="mono-label shrink-0"
          style={{ color: STATUS_COLORS[mission.status] }}
        >
          {STATUS_LABELS[mission.status]}
        </span>
      </div>
      <div
        className="mt-3 pt-3 flex items-center justify-between mono-label"
        style={{
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-muted)",
        }}
      >
        <span>
          {formatDate(mission.startDate)} → {formatDate(mission.endDate)}
        </span>
        <span style={{ color: "var(--color-green)" }}>OUVRIR →</span>
      </div>
    </Link>
  );
}
