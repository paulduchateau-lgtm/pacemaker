export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La chrome (TopBar) vit dans /client/[slug]/layout.tsx qui dispose du slug.
  return <>{children}</>;
}
