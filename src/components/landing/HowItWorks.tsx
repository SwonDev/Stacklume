"use client";

import { BookmarkPlus, FolderKanban, LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";

const ease = [0.25, 0.1, 0.25, 1] as const;

const steps = [
  {
    number: "01",
    icon: BookmarkPlus,
    title: "Guarda",
    description:
      "Un clic para capturar cualquier enlace con título, imagen y metadatos automáticos.",
  },
  {
    number: "02",
    icon: FolderKanban,
    title: "Organiza",
    description:
      "Categorías, etiquetas, estado de lectura. Arrastra y ordena como quieras.",
  },
  {
    number: "03",
    icon: LayoutDashboard,
    title: "Visualiza",
    description:
      "Dashboard bento con widgets de productividad, análisis y herramientas de desarrollo.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 md:py-32 noise">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center"
        >
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            style={{ color: "oklch(0.93 0 0)" }}
          >
            Así de fácil
          </h2>
          <p
            className="mx-auto mt-4 max-w-lg text-base md:text-lg"
            style={{ color: "oklch(0.55 0 0)" }}
          >
            Tres pasos para tener todos tus enlaces bajo control.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15, ease }}
                className="relative"
              >
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-10 right-0 w-[calc(100%-2rem)] h-px translate-x-[calc(50%+1rem)]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, oklch(0.3 0.02 260) 0, oklch(0.3 0.02 260) 6px, transparent 6px, transparent 12px)",
                    }}
                    aria-hidden="true"
                  />
                )}

                <div
                  className="rounded-2xl border p-6 md:p-8 text-center"
                  style={{
                    backgroundColor: "oklch(0.15 0.02 260 / 0.5)",
                    borderColor: "oklch(0.25 0.03 260)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  {/* Number badge */}
                  <span
                    className="inline-block text-xs font-bold mb-4 px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: "oklch(0.75 0.14 85 / 0.12)",
                      color: "oklch(0.75 0.14 85)",
                    }}
                  >
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div
                    className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: "oklch(0.75 0.14 85 / 0.1)",
                      color: "oklch(0.75 0.14 85)",
                    }}
                  >
                    <Icon className="size-7" />
                  </div>

                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "oklch(0.93 0 0)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "oklch(0.55 0 0)" }}
                  >
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
