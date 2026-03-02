"use client";

/**
 * Global error boundary for Next.js App Router.
 * Captura errores no manejados en el árbol de componentes raíz.
 * Requerido por Next.js 16 para generar el segmento _global-error correctamente.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-bold">Algo salió mal</h2>
          <p className="text-muted-foreground">
            Ha ocurrido un error inesperado en la aplicación.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
