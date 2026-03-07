import { NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { isNull } from "drizzle-orm";

export async function GET() {
  try {
    const allLinks = await withRetry(
      () => db.select().from(links).where(isNull(links.deletedAt)),
      { operationName: "fetch all links for duplicates" }
    );

    // Group by normalized URL
    const urlMap = new Map<string, typeof allLinks>();
    for (const link of allLinks) {
      const normalizedUrl = link.url.toLowerCase().replace(/\/+$/, "").replace(/^https?:\/\//, "");
      const group = urlMap.get(normalizedUrl) || [];
      group.push(link);
      urlMap.set(normalizedUrl, group);
    }

    // Filter to only groups with duplicates
    const duplicates = Array.from(urlMap.entries())
      .filter(([, group]) => group.length > 1)
      .map(([url, group]) => ({
        url,
        count: group.length,
        links: group,
      }));

    return NextResponse.json({
      totalDuplicateGroups: duplicates.length,
      totalDuplicateLinks: duplicates.reduce((acc, d) => acc + d.count - 1, 0),
      duplicates,
    });
  } catch (error) {
    console.error("Error finding duplicates:", error);
    return NextResponse.json({ error: "Error al buscar duplicados" }, { status: 500 });
  }
}
