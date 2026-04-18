export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Shell minimal : la chrome navigation (TopBar/BottomBar) vit dans le
  // layout imbriqué /admin/missions/[slug]/layout.tsx qui a besoin du slug.
  // Les pages /admin/missions et /admin/missions/new gèrent leur propre
  // chrome (plus léger, pas de sélecteur de mission interne).
  return <>{children}</>;
}
