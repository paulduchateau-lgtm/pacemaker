import Link from "next/link";
import CreateMissionForm from "@/components/missions/CreateMissionForm";

export const dynamic = "force-dynamic";

export default function NewMissionPage() {
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
          <Link
            href="/admin/missions"
            className="mono-label"
            style={{ color: "var(--color-muted)" }}
          >
            ← MISSIONS
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <h1
          className="text-lg font-medium mb-4"
          style={{ color: "var(--color-ink)" }}
        >
          Nouvelle mission
        </h1>
        <CreateMissionForm />
      </main>
    </div>
  );
}
