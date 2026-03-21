"use client";

import {
  LayoutGrid,
  Columns3,
  BrainCircuit,
  Search,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface FeatureCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  span: "large" | "medium";
}

const features: FeatureCard[] = [
  {
    icon: LayoutGrid,
    title: "120+ Widgets",
    description:
      "Desde reloj y clima hasta cripto y herramientas de desarrollo. Todo incluido, sin plugins.",
    span: "large",
  },
  {
    icon: Columns3,
    title: "3 Vistas",
    description:
      "Bento Grid, Kanban de enlaces y Lista detallada. Cambia en un clic.",
    span: "medium",
  },
  {
    icon: BrainCircuit,
    title: "IA Local",
    description:
      "Chat con Qwen3.5 que busca, guarda y organiza tus enlaces. Todo en tu máquina.",
    span: "medium",
  },
  {
    icon: Search,
    title: "Búsqueda Inteligente",
    description:
      "Full-text search, fuzzy matching y búsquedas guardadas.",
    span: "medium",
  },
  {
    icon: ShieldCheck,
    title: "Privacidad Total",
    description:
      "SQLite local, sin cloud, sin tracking, sin cuentas. Tus datos son tuyos.",
    span: "medium",
  },
  {
    icon: Globe,
    title: "Extensión del Navegador",
    description:
      "Captura enlaces desde Chrome, Edge y Firefox. Detecta plataformas, comandos y tweets.",
    span: "large",
  },
];

export function Features() {
  return (
    <section
      id="funciones"
      className="relative py-24 md:py-32 noise"
      style={{ backgroundColor: "oklch(0.11 0.018 260)" }}
    >
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
            Todo lo que necesitas.{" "}
            <span className="landing-gold-gradient">Nada que sobre.</span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base md:text-lg"
            style={{ color: "oklch(0.55 0 0)" }}
          >
            Diseñado para desarrolladores, creadores y cualquiera que acumule
            demasiados tabs abiertos.
          </p>
        </motion.div>

        {/* Bento grid of features */}
        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isLarge = feature.span === "large";
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-6 md:p-8 transition-all duration-300",
                  "hover:-translate-y-1",
                  isLarge ? "md:col-span-2" : "md:col-span-2",
                )}
                style={{
                  backgroundColor: "oklch(0.15 0.02 260 / 0.6)",
                  borderColor: "oklch(0.25 0.03 260)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute -top-20 -right-20 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: "oklch(0.75 0.14 85 / 0.08)" }}
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  <div
                    className="mb-4 flex size-12 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: "oklch(0.75 0.14 85 / 0.12)",
                      color: "oklch(0.75 0.14 85)",
                    }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "oklch(0.93 0 0)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "oklch(0.55 0 0)" }}
                  >
                    {feature.description}
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
