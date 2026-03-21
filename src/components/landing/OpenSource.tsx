"use client";

import { motion } from "motion/react";
import { BadgeDollarSign, EyeOff, Scale } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";

const PILLARS = [
  {
    icon: BadgeDollarSign,
    title: "Sin pagos",
    description:
      "Completamente gratis. Sin planes premium, sin funciones bloqueadas, sin sorpresas.",
  },
  {
    icon: EyeOff,
    title: "Sin tracking",
    description:
      "Cero telemetría, cero analíticas de usuario. Tu actividad es solo tuya.",
  },
  {
    icon: Scale,
    title: "Licencia MIT",
    description:
      "Código abierto para siempre. Úsalo, modifícalo y distribúyelo libremente.",
  },
];

export function OpenSource() {
  return (
    <section className="relative py-24" style={{ backgroundColor: "#0a1628" }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: "#e8eaf0" }}
          >
            Código abierto. Para siempre.
          </h2>
          <p className="mt-4 text-lg" style={{ color: "#6b7280" }}>
            Construido con transparencia y respeto por el usuario.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <MagicCard
                gradientColor="rgba(212, 168, 83, 0.1)"
                gradientFrom="#d4a853"
                gradientTo="#b8923f"
                gradientSize={180}
                className="h-full rounded-2xl"
              >
                <div className="flex flex-col items-center p-8 text-center">
                  <div
                    className="mb-5 flex size-14 items-center justify-center rounded-xl border border-white/10"
                    style={{ backgroundColor: "rgba(212, 168, 83, 0.1)" }}
                  >
                    <pillar.icon
                      className="size-7"
                      style={{ color: "#d4a853" }}
                    />
                  </div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#e8eaf0" }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "#6b7280" }}
                  >
                    {pillar.description}
                  </p>
                </div>
              </MagicCard>
            </motion.div>
          ))}
        </div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="https://github.com/SwonDev/Stacklume"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-[#e8eaf0]/80 transition-all hover:border-[#d4a853]/40 hover:text-[#d4a853]"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Ver en GitHub
          </a>
          <a
            href="https://ko-fi.com/swondev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-[#6b7280] transition-all hover:border-white/20 hover:text-[#e8eaf0]/80"
          >
            <span>☕</span>
            Apoyar en Ko-fi
          </a>
        </motion.div>
      </div>
    </section>
  );
}
