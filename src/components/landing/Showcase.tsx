"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

type TabId = "bento" | "kanban" | "lista" | "chat";

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: "bento", label: "Bento Grid" },
  { id: "kanban", label: "Kanban" },
  { id: "lista", label: "Lista" },
  { id: "chat", label: "Chat IA" },
];

function BentoMock() {
  const cells = [
    { col: "1/3", row: "1/2", color: "oklch(0.75 0.14 85 / 0.12)" },
    { col: "3/5", row: "1/2", color: "oklch(0.5 0.15 260 / 0.15)" },
    { col: "5/7", row: "1/3", color: "oklch(0.6 0.12 160 / 0.12)" },
    { col: "1/2", row: "2/3", color: "oklch(0.65 0.18 30 / 0.12)" },
    { col: "2/3", row: "2/3", color: "oklch(0.55 0.12 300 / 0.12)" },
    { col: "3/5", row: "2/3", color: "oklch(0.7 0.1 200 / 0.12)" },
    { col: "1/4", row: "3/4", color: "oklch(0.6 0.15 120 / 0.12)" },
    { col: "4/7", row: "3/4", color: "oklch(0.7 0.14 50 / 0.12)" },
  ];
  return (
    <div
      className="grid gap-2 h-full"
      style={{
        gridTemplateColumns: "repeat(6, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className="rounded-lg border"
          style={{
            gridColumn: c.col,
            gridRow: c.row,
            backgroundColor: c.color,
            borderColor: "oklch(0.25 0.03 260)",
          }}
        />
      ))}
    </div>
  );
}

function KanbanMock() {
  const columns = [
    { title: "Por leer", count: 4 },
    { title: "Leyendo", count: 2 },
    { title: "Leído", count: 5 },
  ];
  return (
    <div className="flex gap-3 h-full">
      {columns.map((col) => (
        <div
          key={col.title}
          className="flex-1 rounded-lg border p-3 flex flex-col gap-2"
          style={{
            backgroundColor: "oklch(0.14 0.02 260)",
            borderColor: "oklch(0.25 0.03 260)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.65 0 0)" }}
            >
              {col.title}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "oklch(0.75 0.14 85 / 0.12)",
                color: "oklch(0.75 0.14 85)",
              }}
            >
              {col.count}
            </span>
          </div>
          {Array.from({ length: col.count }).map((_, i) => (
            <div
              key={i}
              className="rounded border h-8"
              style={{
                backgroundColor: "oklch(0.18 0.02 260)",
                borderColor: "oklch(0.25 0.03 260)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ListMock() {
  const rows = 6;
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-2 rounded-lg"
        style={{ backgroundColor: "oklch(0.14 0.02 260)" }}
      >
        <div
          className="h-3 w-16 rounded"
          style={{ backgroundColor: "oklch(0.25 0.03 260)" }}
        />
        <div
          className="h-3 w-32 rounded flex-1"
          style={{ backgroundColor: "oklch(0.25 0.03 260)" }}
        />
        <div
          className="h-3 w-20 rounded"
          style={{ backgroundColor: "oklch(0.25 0.03 260)" }}
        />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: "oklch(0.16 0.02 260 / 0.5)",
            borderColor: "oklch(0.22 0.03 260)",
          }}
        >
          <div
            className="size-6 rounded"
            style={{
              backgroundColor:
                i % 2 === 0
                  ? "oklch(0.75 0.14 85 / 0.15)"
                  : "oklch(0.5 0.15 260 / 0.15)",
            }}
          />
          <div className="flex-1 flex flex-col gap-1.5">
            <div
              className="h-3 rounded"
              style={{
                backgroundColor: "oklch(0.3 0.02 260)",
                width: `${55 + ((i * 17) % 35)}%`,
              }}
            />
            <div
              className="h-2 rounded w-2/5"
              style={{ backgroundColor: "oklch(0.22 0.02 260)" }}
            />
          </div>
          <div
            className="h-5 w-14 rounded-full"
            style={{
              backgroundColor: "oklch(0.75 0.14 85 / 0.1)",
              borderColor: "oklch(0.75 0.14 85 / 0.2)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ChatMock() {
  const messages = [
    { from: "user" as const, text: "Busca recursos sobre React Server Components" },
    { from: "ai" as const, text: "Encontré 3 enlaces relevantes en tu biblioteca y 5 resultados web..." },
    { from: "user" as const, text: "Guarda los dos primeros" },
    { from: "ai" as const, text: "Listo, los he añadido a la categoría Desarrollo." },
  ];
  return (
    <div className="flex flex-col gap-3 h-full justify-end">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn("flex", msg.from === "user" ? "justify-end" : "justify-start")}
        >
          <div
            className="rounded-2xl px-4 py-2.5 max-w-[75%] text-xs leading-relaxed"
            style={{
              backgroundColor:
                msg.from === "user"
                  ? "oklch(0.75 0.14 85 / 0.15)"
                  : "oklch(0.18 0.02 260)",
              borderColor:
                msg.from === "user"
                  ? "oklch(0.75 0.14 85 / 0.25)"
                  : "oklch(0.25 0.03 260)",
              border: "1px solid",
              color: "oklch(0.75 0 0)",
            }}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}

const mockComponents: Record<TabId, React.ComponentType> = {
  bento: BentoMock,
  kanban: KanbanMock,
  lista: ListMock,
  chat: ChatMock,
};

export function Showcase() {
  const [activeTab, setActiveTab] = useState<TabId>("bento");

  return (
    <section
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
            Diseñado para cada{" "}
            <span className="landing-gold-gradient">flujo de trabajo</span>
          </h2>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mt-10 flex justify-center"
        >
          <div
            className="inline-flex gap-1 rounded-full p-1 border"
            style={{
              backgroundColor: "oklch(0.14 0.02 260)",
              borderColor: "oklch(0.22 0.03 260)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                )}
                style={{
                  backgroundColor:
                    activeTab === tab.id
                      ? "oklch(0.75 0.14 85 / 0.15)"
                      : "transparent",
                  color:
                    activeTab === tab.id
                      ? "oklch(0.75 0.14 85)"
                      : "oklch(0.5 0 0)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Mock area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="mt-8 rounded-2xl border p-6 md:p-8"
          style={{
            backgroundColor: "oklch(0.13 0.02 260)",
            borderColor: "oklch(0.22 0.03 260)",
            minHeight: "360px",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease }}
              className="h-[320px]"
            >
              {(() => {
                const Comp = mockComponents[activeTab];
                return <Comp />;
              })()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
