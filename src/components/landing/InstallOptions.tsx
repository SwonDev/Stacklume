import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Globe, Server } from "lucide-react";

const options = [
  {
    icon: Download,
    title: "Desktop (Windows)",
    description:
      "Descarga el instalador. Tus datos quedan en local con SQLite, IA incluida.",
    action: "Descargar",
    href: "https://github.com/SwonDev/Stacklume/releases/latest",
    variant: "default" as const,
  },
  {
    icon: Globe,
    title: "Demo online",
    description:
      "Prueba sin instalar nada. Los datos se guardan en el navegador.",
    action: "Abrir demo",
    href: "https://demo.stacklume.app",
    variant: "outline" as const,
  },
  {
    icon: Server,
    title: "Self-hosted",
    description:
      "Despliega en tu servidor con PostgreSQL. Docker o Node.js.",
    action: "Ver docs",
    href: "https://github.com/SwonDev/Stacklume#readme",
    variant: "outline" as const,
  },
] as const;

export function InstallOptions() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Empieza en segundos
        </h2>
        <p className="mt-4 text-muted-foreground">
          Elige cómo quieres usar Stacklume.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {options.map((option) => (
          <Card
            key={option.title}
            className="border-border/50 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/30"
          >
            <CardContent className="flex flex-col items-center gap-5 pt-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <option.icon className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{option.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Button
                variant={option.variant}
                size="sm"
                className="mt-auto w-full"
                asChild
              >
                <a
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {option.action}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
