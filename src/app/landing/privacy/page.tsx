import Link from "next/link";

export default function PrivacyPage() {
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

        <h1 className="mb-8 text-4xl font-bold">Política de Privacidad</h1>

        <div
          className="space-y-6 text-base leading-relaxed"
          style={{ color: "#6b7280" }}
        >
          <p>
            Stacklume es una aplicación de escritorio de código abierto
            distribuida bajo licencia MIT. Nos tomamos tu privacidad muy en
            serio.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            No recopilamos datos personales
          </h2>
          <p>
            Stacklume no recopila, almacena ni transmite ningún dato personal.
            Toda la información que introduces en la aplicación (enlaces,
            categorías, etiquetas, notas, configuración) se almacena
            exclusivamente en una base de datos SQLite local en tu dispositivo.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Sin analíticas de usuario
          </h2>
          <p>
            No utilizamos servicios de analíticas, telemetría ni seguimiento de
            ningún tipo dentro de la aplicación de escritorio. No sabemos cuántos
            usuarios tiene Stacklume, con qué frecuencia lo usan ni qué
            funciones son las más populares.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Sin cookies de seguimiento
          </h2>
          <p>
            La aplicación de escritorio no utiliza cookies. El sitio web
            stacklume.app utiliza únicamente cookies técnicas mínimas de Vercel
            para el funcionamiento del servidor.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            Extensión del navegador
          </h2>
          <p>
            La extensión de Stacklume para Chrome, Edge y Firefox solo accede a
            la información de la pestaña activa cuando el usuario la activa
            manualmente. No monitoriza la navegación, no accede al historial y
            no envía datos a servidores externos.
          </p>

          <h2 className="text-xl font-semibold" style={{ color: "#e8eaf0" }}>
            IA local
          </h2>
          <p>
            El asistente de IA integrado funciona completamente en local
            mediante un modelo ejecutado en tu propio hardware. Las
            conversaciones no salen de tu dispositivo.
          </p>

          <p className="border-t border-white/10 pt-6 text-sm">
            Última actualización: marzo de 2026
          </p>
        </div>
      </div>
    </div>
  );
}
