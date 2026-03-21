"use client";

const footerSections = [
  {
    title: "Producto",
    links: [
      { label: "Funciones", href: "#funciones" },
      { label: "Descargar", href: "#descargar" },
      { label: "Demo", href: "https://demo.stacklume.app", external: true },
    ],
  },
  {
    title: "Recursos",
    links: [
      {
        label: "Documentación",
        href: "https://github.com/SwonDev/Stacklume#readme",
        external: true,
      },
      {
        label: "Changelog",
        href: "https://github.com/SwonDev/Stacklume/releases",
        external: true,
      },
      {
        label: "Issues",
        href: "https://github.com/SwonDev/Stacklume/issues",
        external: true,
      },
    ],
  },
  {
    title: "Comunidad",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/SwonDev/Stacklume",
        external: true,
      },
      {
        label: "Ko-fi",
        href: "https://ko-fi.com/swondev",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        label: "Licencia MIT",
        href: "https://github.com/SwonDev/Stacklume/blob/main/LICENSE",
        external: true,
      },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: "oklch(0.10 0.015 260)",
        borderColor: "oklch(0.2 0.02 260)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: "oklch(0.75 0 0)" }}
              >
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors hover:text-[oklch(0.75_0.14_85)]"
                      style={{ color: "oklch(0.45 0 0)" }}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
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
        <div
          className="mt-12 pt-8 border-t flex flex-col items-center gap-3 md:flex-row md:justify-between"
          style={{ borderColor: "oklch(0.2 0.02 260)" }}
        >
          <p className="text-xs" style={{ color: "oklch(0.4 0 0)" }}>
            &copy; {new Date().getFullYear()} SwonDev. Todos los derechos
            reservados.
          </p>
          <p
            className="text-xs font-mono"
            style={{ color: "oklch(0.35 0 0)" }}
          >
            Hecho con Tauri, Next.js y mucho caf&eacute;
          </p>
        </div>
      </div>
    </footer>
  );
}
