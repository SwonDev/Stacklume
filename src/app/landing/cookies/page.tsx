import Link from "next/link";

export default function CookiesPage() {
  return (
    <div
      className="min-h-screen px-6 py-24"
      style={{ backgroundColor: "#0a1628", color: "#e8eaf0" }}
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href="/landing"
          className="mb-8 inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#d4a853" }}
        >
          &larr; Volver a Stacklume
        </Link>

        <h1 className="mb-8 text-4xl font-bold">Política de Cookies</h1>

        <div
          className="space-y-6 text-base leading-relaxed"
          style={{ color: "#6b7280" }}
        >
          <p>
            stacklume.app utiliza cookies técnicas mínimas necesarias para el
            funcionamiento del sitio web.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Cookies técnicas
          </h2>
          <p>
            Vercel, nuestro proveedor de hosting, puede establecer cookies
            técnicas estrictamente necesarias para servir las páginas
            correctamente. Estas cookies no contienen información personal ni
            se utilizan con fines de seguimiento.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Sin cookies de seguimiento
          </h2>
          <p>
            No utilizamos cookies de seguimiento, publicidad ni de terceros.
            No integramos servicios de analíticas que requieran cookies (como
            Google Analytics).
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Aplicación de escritorio
          </h2>
          <p>
            La aplicación de escritorio Stacklume no utiliza cookies de ningún
            tipo. Todos los datos se almacenan en una base de datos SQLite
            local en tu dispositivo.
          </p>

          <p className="border-t border-white/10 pt-6 text-sm">
            Última actualización: marzo de 2026
          </p>
        </div>
      </div>
    </div>
  );
}
