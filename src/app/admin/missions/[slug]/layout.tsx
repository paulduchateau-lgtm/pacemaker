import TopBar from "@/components/nav/TopBar";
import BottomBar from "@/components/nav/BottomBar";
import { requireMissionBySlug } from "@/lib/mission";

export const dynamic = "force-dynamic";

export default async function MissionScopedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const mission = await requireMissionBySlug(params.slug);

  return (
    <div
      className="min-h-screen pb-16 lg:pb-0"
      style={{ backgroundColor: "var(--color-paper)" }}
    >
      <TopBar missionSlug={mission.slug} missionLabel={mission.label} />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {children}
      </main>
      <BottomBar missionSlug={mission.slug} />
    </div>
  );
}
