import TopBar from "@/components/nav/TopBar";
import BottomBar from "@/components/nav/BottomBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen pb-16 lg:pb-0"
      style={{ backgroundColor: "var(--color-paper)" }}
    >
      <TopBar />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {children}
      </main>
      <BottomBar />
    </div>
  );
}
