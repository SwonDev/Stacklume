import { NextResponse } from "next/server";
import { db, linkTags, links, tags, withRetry } from "@/lib/db";
import { eq, isNull, and } from "drizzle-orm";

// GET all link-tag associations in a single query
// Filters out associations where the link or tag has been soft-deleted
export async function GET() {
  try {
    const allLinkTags = await withRetry(
      () => db.select({
        linkId: linkTags.linkId,
        tagId: linkTags.tagId,
      })
        .from(linkTags)
        .innerJoin(links, and(eq(linkTags.linkId, links.id), isNull(links.deletedAt)))
        .innerJoin(tags, and(eq(linkTags.tagId, tags.id), isNull(tags.deletedAt))),
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
