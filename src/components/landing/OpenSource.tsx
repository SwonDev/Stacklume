import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Heart } from "lucide-react";

export function OpenSource() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Badge variant="outline" className="mb-6 gap-1.5 px-3 py-1 text-xs">
        <span className="inline-block size-2 rounded-full bg-green-500" />
        Open Source
      </Badge>

      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Código abierto y gratuito
      </h2>

      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        Sin pagos, sin suscripciones, sin tracking. Stacklume es software libre
        bajo licencia MIT. Puedes usarlo, modificarlo y distribuirlo como
        quieras.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button variant="outline" size="lg" className="gap-2" asChild>
          <a
            href="https://github.com/SwonDev/Stacklume"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-5" />
            Ver en GitHub
          </a>
        </Button>

        <Button variant="ghost" size="lg" className="gap-2" asChild>
          <a
            href="https://ko-fi.com/swondev"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Heart className="size-5" />
            Apoyar en Ko-fi
          </a>
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground/60">
        Si te gusta Stacklume, una estrella en GitHub o un café en Ko-fi ayudan
        mucho.
      </p>
    </section>
  );
}
