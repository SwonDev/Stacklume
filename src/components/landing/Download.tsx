"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";
import { motion } from "motion/react";
import { DownloadButton } from "./DownloadButton";

const ease = [0.25, 0.1, 0.25, 1] as const;

export function Download() {
  return (
    <section id="descargar" className="relative py-24 md:py-32 overflow-hidden">
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, oklch(0.75 0.14 85 / 0.06), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
        >
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            style={{ color: "oklch(0.93 0 0)" }}
          >
            Empieza a organizar tus{" "}
            <span className="landing-gold-gradient">enlaces</span> hoy
          </h2>

          <p
            className="mx-auto mt-4 max-w-lg text-base md:text-lg"
            style={{ color: "oklch(0.55 0 0)" }}
          >
            Descarga Stacklume gratis y toma el control de tus marcadores.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <DownloadButton />

            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-6 text-base"
              style={{
                borderColor: "oklch(0.3 0.02 260)",
                color: "oklch(0.75 0 0)",
              }}
              asChild
            >
              <a
                href="https://demo.stacklume.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Probar demo
              </a>
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="gap-2 px-6 text-base"
              style={{ color: "oklch(0.5 0 0)" }}
              asChild
            >
              <a
                href="https://github.com/SwonDev/Stacklume"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                GitHub
              </a>
            </Button>
          </div>

          <p
            className="mt-6 text-xs"
            style={{ color: "oklch(0.4 0 0)" }}
          >
            Gratis y de código abierto &middot; Licencia MIT
          </p>
        </motion.div>
      </div>
    </section>
  );
}
