// TODO: Feature pendiente — búsquedas guardadas en DB.
// La tabla savedSearches aún no existe en el schema. La UI usa localStorage.
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
