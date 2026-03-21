import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stacklume — Tu universo de links, perfectamente organizado",
  description:
    "Gestor de enlaces open-source con 120+ widgets, IA local, Kanban y bento grid. Gratis, privado, sin tracking.",
  openGraph: {
    title: "Stacklume — Tu universo de links, perfectamente organizado",
    description:
      "Gestor de enlaces open-source con 120+ widgets, IA local, Kanban y bento grid. Gratis, privado, sin tracking.",
    type: "website",
    url: "https://stacklume.app",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
