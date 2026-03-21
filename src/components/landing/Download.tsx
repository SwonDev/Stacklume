"use client";

import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { DownloadButton } from "./DownloadButton";

export function Download() {
  return (
    <section
      id="descargar"
      className="relative py-32"
      style={{ backgroundColor: "#0a1628" }}
    >
      {/* Gold radial glow */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, #d4a853 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm sm:p-16"
        >
          <BorderBeam
            size={150}
            duration={10}
            colorFrom="#d4a853"
            colorTo="#e6c77a"
            borderWidth={2}
          />

          <h2
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: "#e8eaf0" }}
          >
            Empieza hoy
          </h2>
          <p className="mt-4 text-lg" style={{ color: "#6b7280" }}>
            Descarga Stacklume y organiza tus enlaces como nunca antes.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <DownloadButton size="large" />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://demo.stacklume.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#e8eaf0]/60 transition-colors hover:text-[#d4a853]"
            >
              Ver demo
              <ExternalLink className="size-3.5" />
            </a>
            <span className="text-[#6b7280]">&middot;</span>
            <a
              href="https://github.com/SwonDev/Stacklume"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#e8eaf0]/60 transition-colors hover:text-[#d4a853]"
            >
              GitHub
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <p className="mt-8 text-xs" style={{ color: "#6b7280" }}>
            Gratis &middot; Código abierto &middot; Licencia MIT
          </p>
        </motion.div>
      </div>
    </section>
  );
}
