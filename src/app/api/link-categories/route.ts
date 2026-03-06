// TODO: Feature pendiente — asociaciones link-categoría múltiples.
// La tabla linkCategories aún no existe en el schema. Ruta stubbed.
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "Función no disponible todavía" },
    { status: 501 }
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    { error: "Función no disponible todavía" },
    { status: 501 }
  );
}
