// TODO: Feature pendiente — colecciones compartidas públicas.
// La tabla sharedCollections aún no existe en el schema. Ruta stubbed.
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ token: string }> }
) {
  return NextResponse.json(
    { error: "Función no disponible todavía" },
    { status: 501 }
  );
}
