"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { DownloadButton } from "./DownloadButton";

const ease = [0.25, 0.1, 0.25, 1] as const;

function BentoMockup() {
  const cells = [
    {
      col: "1 / 3",
      row: "1 / 3",
      bg: "oklch(0.75 0.14 85 / 0.15)",
      border: "oklch(0.75 0.14 85 / 0.25)",
      label: "Dashboard",
    },
    {
      col: "3 / 5",
      row: "1 / 2",
      bg: "oklch(0.5 0.15 260 / 0.2)",
      border: "oklch(0.5 0.15 260 / 0.3)",
      label: "Reloj",
    },
    {
      col: "5 / 7",
      row: "1 / 2",
      bg: "oklch(0.6 0.12 160 / 0.15)",
      border: "oklch(0.6 0.12 160 / 0.25)",
      label: "Notas",
    },
    {
      col: "3 / 4",
      row: "2 / 3",
      bg: "oklch(0.65 0.18 30 / 0.15)",
      border: "oklch(0.65 0.18 30 / 0.25)",
      label: "Todo",
    },
    {
      col: "4 / 5",
      row: "2 / 3",
      bg: "oklch(0.55 0.12 300 / 0.15)",
      border: "oklch(0.55 0.12 300 / 0.25)",
      label: "Stats",
    },
    {
      col: "5 / 7",
      row: "2 / 4",
      bg: "oklch(0.7 0.1 200 / 0.15)",
      border: "oklch(0.7 0.1 200 / 0.25)",
      label: "Enlaces",
    },
    {
      col: "1 / 3",
      row: "3 / 4",
      bg: "oklch(0.6 0.15 120 / 0.15)",
      border: "oklch(0.6 0.15 120 / 0.25)",
      label: "Pomodoro",
    },
    {
      col: "3 / 5",
      row: "3 / 4",
      bg: "oklch(0.7 0.14 50 / 0.15)",
      border: "oklch(0.7 0.14 50 / 0.25)",
      label: "Clima",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease }}
      className="relative mx-auto mt-12 w-full max-w-4xl md:mt-16"
      style={{ perspective: "1200px" }}
    >
      <div
        className="rounded-2xl border p-4 md:p-6"
        style={{
          backgroundColor: "oklch(0.13 0.02 260)",
          borderColor: "oklch(0.25 0.03 260)",
          transform: "rotateX(4deg)",
          transformOrigin: "center bottom",
          boxShadow:
            "0 -4px 40px oklch(0.75 0.14 85 / 0.06), 0 20px 60px oklch(0 0 0 / 0.4)",
        }}
      >
        {/* Title bar */}
        <div className="mb-4 flex items-center gap-2">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: "oklch(0.65 0.18 30)" }}
          />
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: "oklch(0.75 0.14 85)" }}
          />
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: "oklch(0.6 0.12 160)" }}
          />
          <div
            className="ml-3 h-5 w-48 rounded"
            style={{ backgroundColor: "oklch(0.2 0.02 260)" }}
          />
        </div>

        {/* Grid */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(6, 1fr)",
            gridTemplateRows: "repeat(3, 64px)",
          }}
        >
          {cells.map((cell, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.8 + i * 0.06, ease }}
              className="rounded-lg border p-3 flex items-end"
              style={{
                gridColumn: cell.col,
                gridRow: cell.row,
                backgroundColor: cell.bg,
                borderColor: cell.border,
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(0.55 0 0)" }}
              >
                {cell.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden noise">
      {/* Dot grid background */}
      <div
        className="dot-grid absolute inset-0 opacity-40"
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "oklch(0.75 0.14 85 / 0.06)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-6xl px-6 pt-24 pb-12 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <Badge
            variant="outline"
            className="mb-8 px-4 py-1.5 text-xs font-medium"
            style={{
              borderColor: "oklch(0.75 0.14 85 / 0.3)",
              color: "oklch(0.75 0.14 85)",
              backgroundColor: "oklch(0.75 0.14 85 / 0.08)",
            }}
          >
            Open Source &middot; Licencia MIT
          </Badge>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ color: "oklch(0.93 0 0)" }}
        >
          Tu escritorio de enlaces.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease }}
          className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl landing-gold-gradient"
        >
          Organizado. Privado. Tuyo.
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          className="mx-auto mt-6 max-w-2xl text-base md:text-lg"
          style={{ color: "oklch(0.55 0 0)" }}
        >
          Gestor de marcadores open-source con 120+ widgets, IA local y un
          dashboard bento que se adapta a ti.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease }}
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
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
              Ver demo en vivo
            </a>
          </Button>
        </motion.div>

        {/* Version info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75, ease }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs"
          style={{ color: "oklch(0.45 0 0)" }}
        >
          <span>Gratis</span>
          <span>&middot;</span>
          <span>Código abierto</span>
          <span>&middot;</span>
          <span>Windows</span>
        </motion.div>

        {/* Bento mockup */}
        <BentoMockup />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2, ease }}
          className="mt-12 flex justify-center"
        >
          <a
            href="#funciones"
            className="landing-bounce inline-flex flex-col items-center gap-1"
            style={{ color: "oklch(0.4 0 0)" }}
            aria-label="Ir a funciones"
          >
            <ChevronDown className="size-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
