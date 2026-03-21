import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Github, ChevronDown } from "lucide-react";
import { DownloadButton } from "./DownloadButton";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.18 0.05 250 / 0.8), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8">
        {/* Logo mark */}
        <div
          className="flex size-20 items-center justify-center rounded-2xl border border-primary/30 shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.04 250), oklch(0.13 0.03 250))",
            boxShadow: "0 0 40px oklch(0.75 0.14 85 / 0.15)",
          }}
        >
          <span className="text-4xl font-bold text-primary">S</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, oklch(0.82 0.12 85), oklch(0.75 0.14 85), oklch(0.65 0.15 85))",
            }}
          >
            Stacklume
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground sm:text-2xl">
          Tu universo de links, perfectamente organizado
        </p>

        {/* Description */}
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground/80">
          Gestor de marcadores open-source con IA local, 120+ widgets y
          privacidad total. Sin suscripciones, sin tracking, sin cloud
          obligatorio.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <DownloadButton />

          <Button
            variant="outline"
            size="lg"
            className="gap-2 px-6 text-base"
            asChild
          >
            <a
              href="https://demo.stacklume.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-5" />
              Probar demo
            </a>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="gap-2 px-6 text-base"
            asChild
          >
            <a
              href="https://github.com/SwonDev/Stacklume"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-5" />
              Ver en GitHub
            </a>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#features"
        className="absolute bottom-10 flex flex-col items-center gap-2 text-muted-foreground/50 transition-colors hover:text-primary"
        aria-label="Desplazarse a funcionalidades"
      >
        <span className="text-xs tracking-widest uppercase">Descubrir</span>
        <ChevronDown className="size-5 animate-bounce" />
      </a>
    </section>
  );
}
