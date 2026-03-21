"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";

const TABS = [
  { id: "bento", label: "Bento Grid" },
  { id: "kanban", label: "Kanban" },
  { id: "list", label: "Lista" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function BentoMockup() {
  const cells = [
    { w: "col-span-2", h: "row-span-2", color: "#d4a853", label: "Favoritos" },
    { w: "col-span-1", h: "row-span-1", color: "#4a9eff", label: "Notas" },
    { w: "col-span-1", h: "row-span-1", color: "#10b981", label: "Reloj" },
    { w: "col-span-1", h: "row-span-1", color: "#ef4444", label: "Pomodoro" },
    { w: "col-span-1", h: "row-span-1", color: "#8b5cf6", label: "Cripto" },
    { w: "col-span-2", h: "row-span-1", color: "#f59e0b", label: "Estadísticas" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 p-4">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`${cell.w} ${cell.h} min-h-[60px] rounded-lg border border-white/10 p-3`}
          style={{
            background: `linear-gradient(135deg, ${cell.color}20 0%, ${cell.color}08 100%)`,
          }}
        >
          <div
            className="mb-1 size-2 rounded-full"
            style={{ backgroundColor: cell.color }}
          />
          <span className="text-[10px] font-medium text-[#e8eaf0]/50">
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanMockup() {
  const columns = [
    {
      title: "Por leer",
      color: "#6b7280",
      items: ["Tutorial React 19", "Guía de Tauri v2", "Clean Architecture"],
    },
    {
      title: "En progreso",
      color: "#d4a853",
      items: ["Curso TypeScript", "API Design Patterns"],
    },
    {
      title: "Completado",
      color: "#10b981",
      items: ["Intro a Rust", "Docker Basics", "Git Workflow"],
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto p-4">
      {columns.map((col) => (
        <div
          key={col.title}
          className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div className="mb-3 flex items-center gap-2">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: col.color }}
            />
            <span className="text-xs font-semibold text-[#e8eaf0]/70">
              {col.title}
            </span>
            <span className="ml-auto text-[10px] text-[#6b7280]">
              {col.items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {col.items.map((item) => (
              <div
                key={item}
                className="rounded-md border border-white/5 bg-white/5 p-2.5"
              >
                <span className="text-[10px] font-medium text-[#e8eaf0]/60">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListMockup() {
  const items = [
    { title: "React 19 Documentation", url: "react.dev", category: "Frontend", color: "#4a9eff" },
    { title: "Tauri v2 Getting Started", url: "v2.tauri.app", category: "Desktop", color: "#f59e0b" },
    { title: "TypeScript Handbook", url: "typescriptlang.org", category: "Lenguajes", color: "#3b82f6" },
    { title: "Drizzle ORM Docs", url: "orm.drizzle.team", category: "Backend", color: "#10b981" },
    { title: "Tailwind CSS v4", url: "tailwindcss.com", category: "CSS", color: "#06b6d4" },
  ];

  return (
    <div className="flex flex-col p-4">
      {/* Header row */}
      <div className="mb-2 grid grid-cols-[1fr_120px_80px] gap-4 border-b border-white/10 px-3 pb-2">
        <span className="text-[10px] font-semibold text-[#6b7280] uppercase">
          Título
        </span>
        <span className="text-[10px] font-semibold text-[#6b7280] uppercase">
          Dominio
        </span>
        <span className="text-[10px] font-semibold text-[#6b7280] uppercase">
          Categoría
        </span>
      </div>
      {items.map((item) => (
        <div
          key={item.title}
          className="grid grid-cols-[1fr_120px_80px] gap-4 border-b border-white/5 px-3 py-2.5 transition-colors hover:bg-white/5"
        >
          <span className="truncate text-xs font-medium text-[#e8eaf0]/70">
            {item.title}
          </span>
          <span className="truncate text-[10px] text-[#6b7280]">
            {item.url}
          </span>
          <span
            className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-medium"
            style={{
              backgroundColor: `${item.color}20`,
              color: item.color,
            }}
          >
            {item.category}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Showcase() {
  const [activeTab, setActiveTab] = useState<TabId>("bento");

  return (
    <section className="relative py-24" style={{ backgroundColor: "#0a1628" }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ color: "#e8eaf0" }}
          >
            Diseñado para cada flujo de trabajo
          </h2>
          <p className="mt-4 text-lg" style={{ color: "#6b7280" }}>
            Elige la vista que mejor se adapte a tu estilo.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? "#e8eaf0" : "#6b7280",
                }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="showcase-tab"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: "rgba(212, 168, 83, 0.15)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <MagicCard
            gradientColor="rgba(212, 168, 83, 0.1)"
            gradientFrom="#d4a853"
            gradientTo="#b8923f"
            gradientSize={300}
            className="relative overflow-hidden rounded-2xl"
          >
            <BorderBeam
              size={100}
              duration={10}
              colorFrom="#d4a853"
              colorTo="#b8923f"
              borderWidth={1}
            />
            <div className="min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === "bento" && <BentoMockup />}
                  {activeTab === "kanban" && <KanbanMockup />}
                  {activeTab === "list" && <ListMockup />}
                </motion.div>
              </AnimatePresence>
            </div>
          </MagicCard>
        </motion.div>
      </div>
    </section>
  );
}
