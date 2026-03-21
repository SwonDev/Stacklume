"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const NAV_LINKS = [
  { label: "Funciones", href: "#funciones" },
  { label: "Descargar", href: "#descargar" },
  {
    label: "GitHub",
    href: "https://github.com/SwonDev/Stacklume",
    external: true,
  },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[#0a1628]/80 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-3"
        >
          <img
            src="/logo.svg"
            alt="Stacklume"
            className="size-9"
          />
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "#d4a853" }}
          >
            Stacklume
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                if (!link.external) {
                  e.preventDefault();
                  handleNavClick(link.href);
                }
              }}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm font-medium text-[#e8eaf0]/70 transition-colors hover:text-[#d4a853]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <a
            href="#descargar"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#descargar");
            }}
          >
            <ShimmerButton
              shimmerColor="#e6c77a"
              shimmerSize="0.05em"
              background="linear-gradient(135deg, #b8923f, #d4a853)"
              borderRadius="10px"
              className="px-5 py-2 text-sm font-semibold"
            >
              <span style={{ color: "#0a1628" }}>Descargar</span>
            </ShimmerButton>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="text-[#e8eaf0] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0a1628]/95 px-6 py-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (!link.external) {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }
                }}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="text-base font-medium text-[#e8eaf0]/70 transition-colors hover:text-[#d4a853]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#descargar"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("#descargar");
              }}
            >
              <ShimmerButton
                shimmerColor="#e6c77a"
                shimmerSize="0.05em"
                background="linear-gradient(135deg, #b8923f, #d4a853)"
                borderRadius="10px"
                className="w-full px-5 py-2.5 text-sm font-semibold"
              >
                <span style={{ color: "#0a1628" }}>Descargar</span>
              </ShimmerButton>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
