import TopBar from "@/components/nav/TopBar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-paper)" }}>
      <TopBar />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {children}
      </main>
    </div>
  );
}
