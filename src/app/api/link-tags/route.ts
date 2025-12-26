import { NextResponse } from "next/server";
import { db, linkTags, withRetry } from "@/lib/db";

// GET all link-tag associations in a single query
export async function GET() {
  try {
    const allLinkTags = await withRetry(
      () => db.select({
        linkId: linkTags.linkId,
        tagId: linkTags.tagId,
      }).from(linkTags),
      { operationName: "fetch link tags" }
    );

    return NextResponse.json(allLinkTags);
  } catch (error) {
    console.error("Error fetching link tags:", error);
    return NextResponse.json(
      { error: "Error al obtener asociaciones de etiquetas" },
      { status: 500 }
    );
  }
}
