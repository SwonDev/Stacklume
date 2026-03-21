import { Card, CardContent } from "@/components/ui/card";
import {
  LayoutGrid,
  Columns3,
  BotMessageSquare,
  Search,
  ShieldCheck,
  Chrome,
} from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "120+ Widgets",
    description:
      "Desde notas y reloj hasta cripto, dev tools, generadores CSS y herramientas de gamedev.",
  },
  {
    icon: Columns3,
    title: "3 Vistas",
    description:
      "Bento grid personalizable, Kanban de enlaces con columnas y lista detallada con ordenamiento.",
  },
  {
    icon: BotMessageSquare,
    title: "IA Local",
    description:
      "Chat con Qwen3.5 integrado. Busca, clasifica y resume tus enlaces sin enviar datos a la nube.",
  },
  {
    icon: Search,
    title: "Búsqueda inteligente",
    description:
      "Full-text search con FTS5, fuzzy matching y filtros por categoría, etiqueta o plataforma.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidad total",
    description:
      "SQLite local, sin cloud obligatorio, sin telemetría. Tus datos nunca salen de tu máquina.",
  },
  {
    icon: Chrome,
    title: "Extensión del navegador",
    description:
      "Captura enlaces desde Chrome, Edge y Firefox con un clic. Categorización automática.",
  },
] as const;

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Todo lo que necesitas
        </h2>
        <p className="mt-4 text-muted-foreground">
          Un gestor de marcadores completo, sin compromisos.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="border-border/50 bg-card/60 backdrop-blur-sm transition-colors hover:border-primary/30"
          >
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
