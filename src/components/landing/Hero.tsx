"use client";

import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { DownloadButton } from "./DownloadButton";

const MOCK_WIDGETS = [
  { label: "Favoritos", color: "#d4a853", w: 2, h: 2 },
  { label: "Notas", color: "#4a9eff", w: 1, h: 1 },
  { label: "Pomodoro", color: "#ef4444", w: 1, h: 1 },
  { label: "GitHub Trending", color: "#8b5cf6", w: 2, h: 1 },
  { label: "Reloj", color: "#10b981", w: 1, h: 1 },
  { label: "Clima", color: "#06b6d4", w: 1, h: 1 },
  { label: "Estadísticas", color: "#f59e0b", w: 2, h: 1 },
  { label: "To-Do", color: "#ec4899", w: 1, h: 2 },
  { label: "Cripto", color: "#6366f1", w: 1, h: 1 },
  { label: "Calendario", color: "#14b8a6", w: 1, h: 1 },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16">
      {/* Particles background */}
      <Particles
        className="absolute inset-0"
        quantity={30}
        color="#d4a853"
        size={1.2}
        staticity={80}
        ease={80}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur-sm"
        >
          <AnimatedShinyText shimmerWidth={120}>
            Open Source &middot; Licencia MIT &middot; Gratis
          </AnimatedShinyText>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          <span style={{ color: "#e8eaf0" }}>Tu escritorio de enlaces.</span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #e6c77a 0%, #d4a853 40%, #b8923f 100%)",
            }}
          >
            Perfectamente organizado.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl"
          style={{ color: "#6b7280" }}
        >
          Gestor de marcadores con 120+ widgets, IA local y privacidad total.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <DownloadButton size="large" />
          <a
            href="https://demo.stacklume.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-4 text-lg font-medium text-[#e8eaf0]/80 transition-all hover:border-[#d4a853]/40 hover:text-[#d4a853]"
          >
            Ver demo en vivo
            <ExternalLink className="size-4" />
          </a>
        </motion.div>

        {/* Product mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative mt-20 w-full max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <BorderBeam
              size={120}
              duration={8}
              colorFrom="#d4a853"
              colorTo="#b8923f"
              borderWidth={2}
            />

            {/* Bento grid mockup */}
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {MOCK_WIDGETS.map((widget, i) => (
                <MagicCard
                  key={i}
                  gradientColor="rgba(212, 168, 83, 0.15)"
                  gradientFrom="#d4a853"
                  gradientTo="#b8923f"
                  gradientSize={150}
                  className={`rounded-xl ${
                    widget.w === 2 ? "col-span-2" : "col-span-1"
                  } ${widget.h === 2 ? "row-span-2" : "row-span-1"}`}
                >
                  <div
                    className="flex h-full min-h-[80px] flex-col items-start justify-end rounded-xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${widget.color}15 0%, transparent 60%)`,
                    }}
                  >
                    <div
                      className="mb-1.5 size-2 rounded-full"
                      style={{ backgroundColor: widget.color }}
                    />
                    <span className="text-xs font-medium text-[#e8eaf0]/60">
                      {widget.label}
                    </span>
                  </div>
                </MagicCard>
              ))}
            </div>
          </div>

          {/* Glow effect behind mockup */}
          <div
            className="absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, #d4a853 0%, transparent 70%)",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
