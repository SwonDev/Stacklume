import { NextResponse } from "next/server";

// Steam Search API - supports pagination with thousands of results
const STEAM_SEARCH_URL = "https://store.steampowered.com/search/results/";

export interface SteamGame {
  id: number;
  name: string;
  discounted: boolean;
  discountPercent: number;
  originalPrice: string | null;
  finalPrice: string;
  imageUrl: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  storeUrl: string;
  releaseDate: string;
}

export interface SteamSearchResponse {
  games: SteamGame[];
  totalCount: number;
  hasMore: boolean;
  start: number;
  count: number;
}

// Parse HTML results from Steam search API
function parseSearchResults(html: string): SteamGame[] {
  const games: SteamGame[] = [];

  // Match each search result row
  const rowRegex = /<a[^>]*href="https:\/\/store\.steampowered\.com\/app\/(\d+)\/[^"]*"[^>]*data-ds-appid="(\d+)"[^>]*class="search_result_row[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const appId = parseInt(match[2], 10);
    const content = match[3];

    // Extract title
    const titleMatch = content.match(/<span class="title">([^<]+)<\/span>/);
    const name = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : `Game ${appId}`;

    // Extract image directly from HTML - Steam provides valid capsule images
    // IMPORTANT: Don't transform URLs! Steam uses two formats:
    // 1. Old: /steam/apps/{id}/capsule_231x87.jpg
    // 2. New: /steam/apps/{id}/{hash}/capsule_231x87.jpg
    // Transforming breaks the new format, so we use URLs exactly as provided
    const imgMatch = content.match(/<img[^>]*src="([^"]+)"/);
    const imageUrl = imgMatch?.[1] || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`;

    // Extract platforms
    const hasWindows = content.includes('platform_img win');
    const hasMac = content.includes('platform_img mac');
    const hasLinux = content.includes('platform_img linux');

    // Extract release date
    const releaseDateMatch = content.match(/<div class="search_released[^"]*">\s*([^<]+)\s*<\/div>/);
    const releaseDate = releaseDateMatch ? releaseDateMatch[1].trim() : "";

    // Extract price info
    const priceBlockMatch = content.match(/data-price-final="(\d+)"[^>]*data-bundlediscount="[^"]*"[^>]*data-discount="(\d+)"/);
    let finalPriceCents = 0;
    let discountPercent = 0;

    if (priceBlockMatch) {
      finalPriceCents = parseInt(priceBlockMatch[1], 10);
      discountPercent = parseInt(priceBlockMatch[2], 10);
    } else {
      // Try alternative price extraction
      const altPriceMatch = content.match(/data-price-final="(\d+)"/);
      if (altPriceMatch) {
        finalPriceCents = parseInt(altPriceMatch[1], 10);
      }
      const altDiscountMatch = content.match(/data-discount="(\d+)"/);
      if (altDiscountMatch) {
        discountPercent = parseInt(altDiscountMatch[1], 10);
      }
    }

    // Calculate original price if discounted
    let originalPriceCents = 0;
    if (discountPercent > 0 && finalPriceCents > 0) {
      originalPriceCents = Math.round(finalPriceCents / (1 - discountPercent / 100));
    }

    // Format prices
    const formatPrice = (cents: number): string => {
      if (cents === 0) return "Gratis";
      return `${(cents / 100).toFixed(2)}€`;
    };

    games.push({
      id: appId,
      name,
      discounted: discountPercent > 0,
      discountPercent,
      originalPrice: discountPercent > 0 ? formatPrice(originalPriceCents) : null,
      finalPrice: formatPrice(finalPriceCents),
      imageUrl,
      platforms: {
        windows: hasWindows,
        mac: hasMac,
        linux: hasLinux,
      },
      storeUrl: `https://store.steampowered.com/app/${appId}`,
      releaseDate,
    });
  }

  return games;
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Category configurations
type CategoryType = "new_releases" | "coming_soon" | "specials" | "top_sellers" | "most_played";

const CATEGORY_CONFIGS: Record<CategoryType, Record<string, string>> = {
  new_releases: {
    sort_by: "Released_DESC",
    filter: "topsellers", // Recent releases that are selling
    specials: "0",
  },
  coming_soon: {
    sort_by: "Released_ASC",
    filter: "comingsoon",
    specials: "0",
  },
  specials: {
    sort_by: "_ASC", // Default sorting for sales
    specials: "1",
  },
  top_sellers: {
    sort_by: "_ASC",
    filter: "topsellers",
    specials: "0",
  },
  most_played: {
    sort_by: "_ASC",
    filter: "popularnew",
    specials: "0",
  },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") || "specials") as CategoryType;
    const start = parseInt(searchParams.get("start") || "0", 10);
    const count = Math.min(parseInt(searchParams.get("count") || "50", 10), 100); // Max 100 per request
    const searchTerm = searchParams.get("term") || "";

    const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.specials;

    // Build search URL
    const steamParams = new URLSearchParams({
      start: start.toString(),
      count: count.toString(),
      dynamic_data: "",
      snr: "1_7_7_230_7",
      infinite: "1",
      cc: "es",
      l: "spanish",
    });

    // If searching, use term parameter; otherwise use category filters
    if (searchTerm) {
      steamParams.set("term", searchTerm);
    } else {
      steamParams.set("sort_by", config.sort_by);
      if (config.specials === "1") {
        steamParams.set("specials", "1");
      }
      if (config.filter) {
        steamParams.set("filter", config.filter);
      }
    }

    const response = await fetch(`${STEAM_SEARCH_URL}?${steamParams.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      cache: "no-store", // Disable cache to ensure pagination works correctly
    });

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();
    const games = parseSearchResults(data.results_html || "");
    const totalCount = data.total_count || 0;

    const result: SteamSearchResponse = {
      games,
      totalCount,
      hasMore: start + count < totalCount,
      start,
      count: games.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Steam API fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Steam games", games: [], totalCount: 0, hasMore: false },
      { status: 500 }
    );
  }
}
