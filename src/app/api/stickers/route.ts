import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { StickerDefinition } from "@/types/sticker";

// Cache the sticker list to avoid filesystem reads on every request
let cachedStickers: StickerDefinition[] | null = null;

function loadStickers(): StickerDefinition[] {
  if (cachedStickers) {
    return cachedStickers;
  }

  const stickersDir = path.join(process.cwd(), "public", "stickers");
  const stickers: StickerDefinition[] = [];

  try {
    // Check if directory exists
    if (!fs.existsSync(stickersDir)) {
      console.warn("Stickers directory not found:", stickersDir);
      return [];
    }

    // Read all PNG files from the stickers directory
    const files = fs.readdirSync(stickersDir);

    files.forEach((filename, index) => {
      if (filename.toLowerCase().endsWith(".png")) {
        const name = filename.replace(/\.png$/i, "").replace(/_/g, " ");

        stickers.push({
          id: `sticker-${index}-${filename}`,
          filename,
          path: `/stickers/${filename}`,
          name,
          category: categorizeSticker(filename),
        });
      }
    });

    // Sort stickers by filename for consistent ordering
    stickers.sort((a, b) => a.filename.localeCompare(b.filename));

    // Cache the result
    cachedStickers = stickers;

    return stickers;
  } catch (error) {
    console.error("Error loading stickers:", error);
    return [];
  }
}

// Simple categorization based on filename patterns
function categorizeSticker(filename: string): string {
  const lower = filename.toLowerCase();

  if (/cat|dog|bird|fish|animal|bunny|bear|fox|owl|bee/i.test(lower)) {
    return "animals";
  }
  if (/food|pizza|cake|fruit|coffee|tea|burger|ice/i.test(lower)) {
    return "food";
  }
  if (/tree|flower|sun|moon|star|cloud|rain|leaf|plant/i.test(lower)) {
    return "nature";
  }
  if (/heart|star|arrow|check|cross|circle|square/i.test(lower)) {
    return "symbols";
  }
  if (/person|face|hand|people|emoji/i.test(lower)) {
    return "people";
  }

  return "other";
}

export async function GET() {
  try {
    const stickers = loadStickers();

    return NextResponse.json(stickers);
  } catch (error) {
    console.error("Error in stickers API:", error);
    return NextResponse.json(
      { error: "Failed to load stickers" },
      { status: 500 }
    );
  }
}
