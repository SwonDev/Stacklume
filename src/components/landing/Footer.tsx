"use client";

const FOOTER_LINKS = {
  Producto: [
    { label: "Funciones", href: "#funciones" },
    { label: "Descargar", href: "#descargar" },
    {
      label: "Changelog",
      href: "https://github.com/SwonDev/Stacklume/releases",
      external: true,
    },
  ],
  Recursos: [
    {
      label: "GitHub",
      href: "https://github.com/SwonDev/Stacklume",
      external: true,
    },
    {
      label: "Demo",
      href: "https://demo.stacklume.app",
      external: true,
    },
    {
      label: "Documentación",
      href: "https://github.com/SwonDev/Stacklume#readme",
      external: true,
    },
  ],
  Legal: [
    { label: "Privacidad", href: "/landing/privacy" },
    { label: "Cookies", href: "/landing/cookies" },
    {
      label: "Licencia MIT",
      href: "https://github.com/SwonDev/Stacklume/blob/main/LICENSE",
      external: true,
    },
  ],
  Comunidad: [
    {
      label: "Ko-fi",
      href: "https://ko-fi.com/swondev",
      external: true,
    },
    {
      label: "Twitter / X",
      href: "https://x.com/SwonDev",
      external: true,
    },
  ],
};

export function Footer() {
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer
      className="border-t border-white/5"
      style={{ backgroundColor: "#070e1a" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4
                className="mb-4 text-sm font-semibold"
                style={{ color: "#e8eaf0" }}
              >
                {category}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-sm transition-colors"
                      style={{ color: "#6b7280" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#d4a853")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#6b7280")
                      }
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Stacklume" className="size-6" />
            <span className="text-sm font-medium" style={{ color: "#d4a853" }}>
              Stacklume
            </span>
          </div>
          <p
            className="text-center text-xs"
            style={{ color: "#6b7280", fontFamily: "monospace" }}
          >
            &copy; 2026 SwonDev &middot; Hecho con Tauri, Next.js y mucho
            caf&eacute;
          </p>
        </div>
      </div>
    </footer>
  );
}
