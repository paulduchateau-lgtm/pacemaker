import Link from "next/link";
import { listMissions } from "@/lib/mission";
import MissionCard from "@/components/missions/MissionCard";

export const dynamic = "force-dynamic";

export default async function MissionsListPage() {
  const missions = await listMissions({
    statuses: ["active", "paused", "archived"],
  });

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-paper)" }}
    >
      <header
        className="sticky top-0 z-50 px-4 md:px-6 py-3"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/admin/missions"
            className="font-mono text-sm font-medium tracking-wider"
          >
            PACEMAKER
          </Link>
          <span
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            MISSIONS
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1
              className="text-lg font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              Missions
            </h1>
            <p
              className="mono-label mt-1"
              style={{ color: "var(--color-muted)" }}
            >
              {missions.length} mission{missions.length > 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/admin/missions/new"
            className="px-4 py-2 mono-label transition-opacity"
            style={{
              backgroundColor: "var(--color-green)",
              color: "var(--color-ink)",
              borderRadius: "6px",
            }}
          >
            + NOUVELLE MISSION
          </Link>
        </div>

        {missions.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              color: "var(--color-muted)",
            }}
          >
            Aucune mission pour l&apos;instant.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
