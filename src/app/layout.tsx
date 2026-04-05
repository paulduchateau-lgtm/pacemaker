import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pacemaker - Pilotage de Mission",
  description: "Application de pilotage de mission de consulting BI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
