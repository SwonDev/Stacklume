import { NextResponse } from "next/server";

// Nintendo uses Algolia for their eShop data
const ALGOLIA_APP_ID = "U3B6GR4UA3";
const ALGOLIA_API_KEY = "a29c6927638bfd8cee23993e51e721c9";
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/store_all_products_en_us/query`;

export interface NintendoGame {
  id: string;
  nsuid: string;
  title: string;
  description: string;
  imageUrl: string;
  heroImage?: string;
  gallery: string[]; // Array of screenshot URLs for preview
  publisher: string;
  releaseDate: string;
  regularPrice: number;
  currentPrice: number;
  currency: string;
  discountPercent: number;
  isOnSale: boolean;
  saleEndsAt?: string;
  playerCount: string;
  rating?: string;
  storeUrl: string;
  genres: string[];
  platforms: string[];
}

export interface NintendoDealsResponse {
  games: NintendoGame[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
  count: number;
}

// Category types - maps to sorting/filtering strategies
type CategoryType = "sales" | "ranking" | "new";

// Algolia response types
interface AlgoliaHit {
  objectID: string;
  nsuid?: string;
  title?: string;
  description?: string;
  productImage?: string;
  productGallery?: Array<{ publicId: string; resourceType: string }>;
  releaseDate?: string;
  releaseDateDisplay?: string;
  releaseDateTimestamp?: number; // Unix timestamp for filtering
  url?: string;
  urlKey?: string;
  platformCode?: string;
  platform?: string;
  genres?: string[];
  gameGenreLabels?: string[];
  playModes?: string[];
  contentRating?: {
    code?: string;
    label?: string;
  };
  contentRatingCode?: string;
  price?: {
    finalPrice?: number;
    regPrice?: number;
    discounted?: boolean;
    salePrice?: number;
    percentOff?: number;
    amountOff?: number;
  };
  eshopDetails?: {
    regularPrice?: number;
    discountPrice?: number;
    discountPriceEnd?: string;
    discountPriceEndTimestamp?: number;
    currency?: string;
  };
  franchises?: string[];
  topLevelFilters?: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

function parseAlgoliaGames(hits: AlgoliaHit[]): NintendoGame[] {
  return hits
    .filter(hit => hit.title && (hit.price?.finalPrice !== undefined || hit.eshopDetails?.regularPrice !== undefined))
    .map((hit) => {
      const price = hit.price || {};
      const eshop = hit.eshopDetails || {};

      const regularPrice = price.regPrice ?? eshop.regularPrice ?? 0;
      const currentPrice = price.finalPrice ?? eshop.discountPrice ?? regularPrice;
      const discountPercent = price.percentOff ?? (regularPrice > 0 && currentPrice < regularPrice
        ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
        : 0);

      // Build image URL from Cloudinary
      const imageUrl = hit.productImage
        ? `https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,b_white/f_auto/q_auto/${hit.productImage}`
        : `https://assets.nintendo.com/image/upload/ar_16:9,c_lpad/b_white/f_auto/q_auto/ncom/software/${hit.nsuid || hit.objectID}/icon`;

      // Build gallery from productGallery (screenshots)
      const gallery: string[] = [];
      if (hit.productGallery && hit.productGallery.length > 0) {
        hit.productGallery
          .filter(item => item.resourceType === "image")
          .slice(0, 6) // Limit to 6 images
          .forEach(item => {
            gallery.push(`https://assets.nintendo.com/image/upload/ar_16:9,c_fill/f_auto/q_auto/${item.publicId}`);
          });
      }
      // If no gallery, use the main image
      if (gallery.length === 0) {
        gallery.push(imageUrl);
      }

      // Extract genres
      const genres = hit.gameGenreLabels || hit.genres || [];

      // Determine player count from play modes
      let playerCount = "1 jugador";
      if (hit.playModes) {
        if (hit.playModes.includes("Online Play")) {
          playerCount = "1+ jugadores (Online)";
        } else if (hit.playModes.includes("Local Multiplayer")) {
          playerCount = "1-4 jugadores";
        }
      }

      // Get rating
      const rating = hit.contentRating?.label || hit.contentRatingCode;

      // Build store URL
      const storeUrl = hit.url
        ? `https://www.nintendo.com${hit.url}`
        : `https://www.nintendo.com/us/store/products/${hit.urlKey || hit.objectID}/`;

      return {
        id: hit.objectID || hit.nsuid || "",
        nsuid: hit.nsuid || hit.objectID || "",
        title: hit.title || "Unknown",
        description: hit.description || "",
        imageUrl,
        heroImage: imageUrl,
        gallery,
        publisher: hit.franchises?.[0] || "Nintendo",
        releaseDate: hit.releaseDate || "",
        regularPrice,
        currentPrice,
        currency: eshop.currency || "USD",
        discountPercent,
        isOnSale: discountPercent > 0 || price.discounted === true,
        saleEndsAt: eshop.discountPriceEnd,
        playerCount,
        rating,
        storeUrl,
        genres,
        platforms: [hit.platform || hit.platformCode || "Nintendo Switch"],
      };
    });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") || "sales") as CategoryType;
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const count = Math.min(parseInt(searchParams.get("count") || "30", 10), 100);
    const searchTerm = searchParams.get("term") || "";

    // Build Algolia query
    const page = Math.floor(offset / count);

    // Base filters - only games with prices
    const facetFilters: string[][] = [["topLevelCategory:Games"]];

    // Build the query body based on category
    interface AlgoliaQueryBody {
      query: string;
      hitsPerPage: number;
      page: number;
      facetFilters: string[][];
    }

    const queryBody: AlgoliaQueryBody = {
      query: searchTerm,
      hitsPerPage: count,
      page,
      facetFilters,
    };

    // Category-specific filtering using Algolia facets
    if (category === "sales") {
      // Use topLevelFilters:Deals facet to get only games on sale
      facetFilters.push(["topLevelFilters:Deals"]);
    } else if (category === "new") {
      // Use availability:New releases facet for recently released games
      facetFilters.push(["availability:New releases"]);
    }
    // For "ranking", we keep default Algolia relevance order (popular/featured games)

    const response = await fetch(ALGOLIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      },
      body: JSON.stringify(queryBody),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Algolia API error: ${response.status}`);
      return NextResponse.json({
        games: [],
        totalCount: 0,
        hasMore: false,
        offset,
        count: 0,
        error: "Nintendo API temporarily unavailable",
      });
    }

    const data: AlgoliaResponse = await response.json();
    let games = parseAlgoliaGames(data.hits);

    // Client-side sorting based on category
    if (category === "sales") {
      // Sort by discount percentage (highest first)
      // Games are already filtered by Deals facet, so all should be on sale
      games = games.sort((a, b) => b.discountPercent - a.discountPercent);
    } else if (category === "new") {
      // Sort by release date (newest first)
      games = games.sort((a, b) => {
        const dateA = new Date(a.releaseDate || 0).getTime();
        const dateB = new Date(b.releaseDate || 0).getTime();
        return dateB - dateA;
      });
    } else if (category === "ranking") {
      // For ranking, we show popular/featured games (default Algolia order is by relevance)
      // Keep the original order which tends to show popular games
    }

    const totalCount = data.nbHits;

    const result: NintendoDealsResponse = {
      games,
      totalCount,
      hasMore: (page + 1) * count < totalCount,
      offset,
      count: games.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Nintendo API fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Nintendo games",
        games: [],
        totalCount: 0,
        hasMore: false,
        offset: 0,
        count: 0,
      },
      { status: 500 }
    );
  }
}

// Search endpoint via POST for more complex queries
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query = "", filters = {}, page = 0, hitsPerPage = 30 } = body;

    const facetFilters: string[][] = [["topLevelCategory:Games"]];

    // Add platform filter if specified
    if (filters.platform) {
      facetFilters.push([`platformCode:${filters.platform}`]);
    }

    // Add genre filter if specified
    if (filters.genre) {
      facetFilters.push([`genres:${filters.genre}`]);
    }

    const response = await fetch(ALGOLIA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      },
      body: JSON.stringify({
        query,
        hitsPerPage: Math.min(hitsPerPage, 100),
        page,
        facetFilters,
      }),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Algolia API error: ${response.status}`);
    }

    const data: AlgoliaResponse = await response.json();
    const games = parseAlgoliaGames(data.hits);

    return NextResponse.json({
      games,
      totalCount: data.nbHits,
      hasMore: (page + 1) * hitsPerPage < data.nbHits,
      page,
      count: games.length,
    });
  } catch (error) {
    console.error("Nintendo Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search Nintendo games" },
      { status: 500 }
    );
  }
}
