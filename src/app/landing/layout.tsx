import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stacklume — Tu universo de links, perfectamente organizado",
  description:
    "Gestor de marcadores open-source para Windows con 120+ widgets, IA local, Kanban, bento grid y 23 temas. Gratis, privado, sin tracking.",
  keywords: [
    "bookmark manager",
    "gestor de marcadores",
    "link organizer",
    "bento grid",
    "Tauri",
    "open source",
    "desktop app",
    "widgets",
    "IA local",
  ],
  authors: [{ name: "SwonDev", url: "https://github.com/SwonDev" }],
  openGraph: {
    title: "Stacklume — Tu universo de links, perfectamente organizado",
    description:
      "Gestor de marcadores open-source con 120+ widgets, IA local, Kanban y bento grid. Gratis, privado, sin tracking.",
    type: "website",
    url: "https://stacklume.app",
    siteName: "Stacklume",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stacklume — Tu universo de links, perfectamente organizado",
    description:
      "Gestor de marcadores open-source con 120+ widgets, IA local, Kanban y bento grid. Gratis, privado, sin tracking.",
  },
  metadataBase: new URL("https://stacklume.app"),
  robots: { index: true, follow: true },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
