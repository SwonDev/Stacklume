"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Funciones", href: "#funciones" },
    { label: "Descargar", href: "#descargar" },
    {
      label: "GitHub",
      href: "https://github.com/SwonDev/Stacklume",
      external: true,
    },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "backdrop-blur-xl border-b border-white/10"
          : "border-b border-transparent",
      )}
      style={{
        backgroundColor: scrolled
          ? "oklch(0.13 0.02 260 / 0.8)"
          : "transparent",
      }}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <span
            className="flex size-8 items-center justify-center rounded-lg font-bold text-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.75 0.14 85), oklch(0.65 0.15 85))",
              color: "oklch(0.12 0.03 250)",
            }}
          >
            S
          </span>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: "oklch(0.93 0 0)" }}
          >
            Stacklume
          </span>
        </a>

        {/* Center navigation — desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium transition-colors hover:text-[oklch(0.75_0.14_85)]"
                style={{ color: "oklch(0.55 0 0)" }}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA — desktop */}
        <div className="hidden md:block">
          <Button
            size="sm"
            className="gap-2 font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.75 0.14 85), oklch(0.65 0.15 85))",
              color: "oklch(0.12 0.03 250)",
            }}
            asChild
          >
            <a href="#descargar">
              <Download className="size-4" />
              Descargar
            </a>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? (
            <X className="size-5" style={{ color: "oklch(0.93 0 0)" }} />
          ) : (
            <Menu className="size-5" style={{ color: "oklch(0.93 0 0)" }} />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-b border-white/10"
            style={{ backgroundColor: "oklch(0.13 0.02 260 / 0.95)" }}
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "oklch(0.75 0 0)" }}
                  onClick={() => setMobileOpen(false)}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
              <Button
                size="sm"
                className="gap-2 font-semibold w-fit"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.75 0.14 85), oklch(0.65 0.15 85))",
                  color: "oklch(0.12 0.03 250)",
                }}
                asChild
              >
                <a href="#descargar" onClick={() => setMobileOpen(false)}>
                  <Download className="size-4" />
                  Descargar
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
