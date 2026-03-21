"use client";

import { motion } from "motion/react";
import { LayoutGrid, Palette, Globe, Columns3 } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";

const STATS = [
  {
    value: 120,
    suffix: "+",
    label: "Widgets",
    icon: LayoutGrid,
  },
  {
    value: 23,
    suffix: "",
    label: "Temas",
    icon: Palette,
  },
  {
    value: 15,
    suffix: "+",
    label: "Plataformas",
    icon: Globe,
  },
  {
    value: 3,
    suffix: "",
    label: "Vistas",
    icon: Columns3,
  },
];

export function Stats() {
  return (
    <section className="relative py-24">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a1628 0%, #0d1b30 50%, #0a1628 100%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <stat.icon className="size-6" style={{ color: "#d4a853" }} />
              </div>
              <div className="flex items-baseline gap-0.5">
                <NumberTicker
                  value={stat.value}
                  delay={0.3 + i * 0.15}
                  className="text-4xl font-bold text-[#e8eaf0] sm:text-5xl"
                />
                {stat.suffix && (
                  <span className="text-3xl font-bold sm:text-4xl" style={{ color: "#d4a853" }}>
                    {stat.suffix}
                  </span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium" style={{ color: "#6b7280" }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
