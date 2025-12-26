import { NextRequest, NextResponse } from "next/server";
import { db, linkTags, tags, withRetry } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// GET all tags for a specific link
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json(
        { error: "ID de enlace requerido" },
        { status: 400 }
      );
    }

    const linkTagsResult = await withRetry(
      () => db.select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        createdAt: tags.createdAt,
      }).from(linkTags).innerJoin(tags, eq(linkTags.tagId, tags.id)).where(eq(linkTags.linkId, linkId)),
      { operationName: "fetch tags for link" }
    );

    return NextResponse.json(linkTagsResult);
  } catch (error) {
    console.error("Error fetching link tags:", error);
    return NextResponse.json(
      { error: "Error al obtener etiquetas del enlace" },
      { status: 500 }
    );
  }
}

// POST add tag to link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkId, tagId } = body;

    if (!linkId || !tagId) {
      return NextResponse.json(
        { error: "linkId y tagId son requeridos" },
        { status: 400 }
      );
    }

    const [created] = await withRetry(
      () => db.insert(linkTags).values({ linkId, tagId }).returning(),
      { operationName: "add tag to link" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error adding tag to link:", error);
    return NextResponse.json(
      { error: "Error al agregar etiqueta al enlace" },
      { status: 500 }
    );
  }
}

// DELETE remove tag from link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const tagId = searchParams.get("tagId");

    if (!linkId || !tagId) {
      return NextResponse.json(
        { error: "linkId y tagId son requeridos" },
        { status: 400 }
      );
    }

    const [deleted] = await withRetry(
      () => db.delete(linkTags).where(and(eq(linkTags.linkId, linkId), eq(linkTags.tagId, tagId))).returning(),
      { operationName: "remove tag from link" }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Asociación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error removing tag from link:", error);
    return NextResponse.json(
      { error: "Error al eliminar etiqueta del enlace" },
      { status: 500 }
    );
  }
}
