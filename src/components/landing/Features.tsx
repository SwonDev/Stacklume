"use client";

import { motion } from "motion/react";
import {
  LayoutGrid,
  Columns3,
  Bot,
  Search,
  Shield,
  Globe,
} from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";

const FEATURES = [
  {
    title: "120+ Widgets",
    description:
      "Desde reloj y notas hasta cripto y herramientas de desarrollo. Todo en un solo lugar.",
    icon: LayoutGrid,
    large: true,
  },
  {
    title: "3 Vistas",
    description: "Bento Grid, Kanban y Lista detallada.",
    icon: Columns3,
    large: false,
  },
  {
    title: "IA Local",
    description:
      "Chat con Qwen3.5 que busca, guarda y organiza tus enlaces.",
    icon: Bot,
    large: false,
  },
  {
    title: "Búsqueda",
    description: "Full-text, fuzzy matching y búsquedas guardadas.",
    icon: Search,
    large: false,
  },
  {
    title: "Privacidad",
    description: "SQLite local, sin cloud, sin tracking. Tus datos son tuyos.",
    icon: Shield,
    large: false,
  },
  {
    title: "Extensión",
    description:
      "Captura enlaces desde Chrome, Edge y Firefox con un solo clic.",
    icon: Globe,
    large: true,
  },
];

export function Features() {
  return (
    <section id="funciones" className="relative py-24" style={{ backgroundColor: "#0a1628" }}>
      <div className="mx-auto max-w-6xl px-6">
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
            Todo lo que necesitas
          </h2>
          <p className="mt-4 text-lg" style={{ color: "#6b7280" }}>
            Herramientas poderosas para organizar tu vida digital.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={feature.large ? "sm:col-span-2" : "col-span-1"}
            >
              <MagicCard
                gradientColor="rgba(212, 168, 83, 0.12)"
                gradientFrom="#d4a853"
                gradientTo="#b8923f"
                gradientSize={200}
                className="h-full rounded-2xl"
              >
                <div className="flex h-full flex-col p-6 sm:p-8">
                  <div
                    className="mb-5 flex size-12 items-center justify-center rounded-xl border border-white/10"
                    style={{ backgroundColor: "rgba(212, 168, 83, 0.1)" }}
                  >
                    <feature.icon
                      className="size-6"
                      style={{ color: "#d4a853" }}
                    />
                  </div>
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "#e8eaf0" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="mt-2 leading-relaxed"
                    style={{ color: "#6b7280" }}
                  >
                    {feature.description}
                  </p>
                </div>
              </MagicCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
