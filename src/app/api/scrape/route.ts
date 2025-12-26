import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { detectPlatform, type ContentType, type Platform } from "@/lib/platform-detection";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";
import { createModuleLogger } from "@/lib/logger";
import { scrapeCache } from "@/lib/cache";

// Create a module-specific logger
const log = createModuleLogger("api/scrape");

interface ScrapeResult {
  title: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  author: string | null;
  // Platform-specific fields
  platform: Platform;
  contentType: ContentType;
  platformLabel: string;
  platformColor: string;
  platformIcon: string;
}

// Check if a YouTube thumbnail exists and return best quality
async function getYouTubeThumbnail(videoId: string): Promise<string> {
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

  for (const quality of qualities) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      // Check if image exists and is not placeholder (placeholder is ~1KB)
      if (response.ok && contentLength && parseInt(contentLength) > 2000) {
        return url;
      }
    } catch {
      continue;
    }
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Platform-specific scrapers using APIs (no browser needed)
async function scrapeWithAPIs(url: string, detection: ReturnType<typeof detectPlatform>): Promise<Partial<ScrapeResult> | null> {
  try {
    // YouTube - use oEmbed API
    if (detection.platform === 'youtube' && detection.id) {
      const oEmbedUrl = detection.oEmbedUrl;
      let title = 'YouTube Video';
      let author: string | null = null;

      if (oEmbedUrl) {
        try {
          const response = await fetch(oEmbedUrl);
          if (response.ok) {
            const data = await response.json();
            title = data.title || title;
            author = data.author_name || null;
          }
        } catch {
          // Continue with defaults
        }
      }

      const imageUrl = await getYouTubeThumbnail(detection.id);

      return {
        title,
        description: null,
        imageUrl,
        faviconUrl: 'https://www.youtube.com/favicon.ico',
        siteName: 'YouTube',
        author,
        platform: 'youtube',
        contentType: 'video',
        platformLabel: 'YouTube',
        platformColor: '#FF0000',
        platformIcon: 'Youtube',
      };
    }

    // Steam - use Steam API
    if (detection.platform === 'steam' && detection.id) {
      try {
        const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${detection.id}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const gameData = data[detection.id];
          if (gameData?.success && gameData.data) {
            const game = gameData.data;
            return {
              title: game.name,
              description: game.short_description,
              imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${detection.id}/header.jpg`,
              faviconUrl: 'https://store.steampowered.com/favicon.ico',
              siteName: 'Steam',
              author: game.developers?.join(', ') || null,
              platform: 'steam',
              contentType: 'game',
              platformLabel: 'Steam',
              platformColor: '#1B2838',
              platformIcon: 'Gamepad2',
            };
          }
        }
      } catch {
        // Fallback below
      }
      return {
        title: 'Steam Game',
        imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${detection.id}/header.jpg`,
        faviconUrl: 'https://store.steampowered.com/favicon.ico',
        siteName: 'Steam',
        platform: 'steam',
        contentType: 'game',
        platformLabel: 'Steam',
        platformColor: '#1B2838',
        platformIcon: 'Gamepad2',
      };
    }

    // Spotify - use oEmbed
    if (detection.platform === 'spotify' && detection.oEmbedUrl) {
      try {
        const response = await fetch(detection.oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title || 'Spotify',
            description: null,
            imageUrl: data.thumbnail_url || null,
            faviconUrl: 'https://open.spotify.com/favicon.ico',
            siteName: 'Spotify',
            author: null,
            platform: 'spotify',
            contentType: 'music',
            platformLabel: 'Spotify',
            platformColor: '#1DB954',
            platformIcon: 'Music',
          };
        }
      } catch {
        // Fall through
      }
    }

    // Vimeo - use oEmbed
    if (detection.platform === 'vimeo' && detection.oEmbedUrl) {
      try {
        const response = await fetch(detection.oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title || 'Vimeo Video',
            description: data.description || null,
            imageUrl: data.thumbnail_url || null,
            faviconUrl: 'https://vimeo.com/favicon.ico',
            siteName: 'Vimeo',
            author: data.author_name || null,
            platform: 'vimeo',
            contentType: 'video',
            platformLabel: 'Vimeo',
            platformColor: '#1AB7EA',
            platformIcon: 'Video',
          };
        }
      } catch {
        // Fall through
      }
    }

    // SoundCloud - use oEmbed
    if (detection.platform === 'soundcloud' && detection.oEmbedUrl) {
      try {
        const response = await fetch(detection.oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title || 'SoundCloud',
            description: data.description || null,
            imageUrl: data.thumbnail_url || null,
            faviconUrl: 'https://soundcloud.com/favicon.ico',
            siteName: 'SoundCloud',
            author: data.author_name || null,
            platform: 'soundcloud',
            contentType: 'music',
            platformLabel: 'SoundCloud',
            platformColor: '#FF5500',
            platformIcon: 'Music',
          };
        }
      } catch {
        // Fall through
      }
    }

    // CodePen - use oEmbed
    if (detection.platform === 'codepen' && detection.oEmbedUrl) {
      try {
        const response = await fetch(detection.oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title || 'CodePen',
            description: null,
            imageUrl: data.thumbnail_url || null,
            faviconUrl: 'https://codepen.io/favicon.ico',
            siteName: 'CodePen',
            author: data.author_name || null,
            platform: 'codepen',
            contentType: 'code',
            platformLabel: 'CodePen',
            platformColor: '#000000',
            platformIcon: 'Codepen',
          };
        }
      } catch {
        // Fall through
      }
    }

    // GitHub - use API for repo info + OpenGraph image
    if (detection.platform === 'github' && detection.id && detection.secondaryId) {
      const ogImageUrl = `https://opengraph.githubassets.com/1/${detection.id}/${detection.secondaryId}`;

      try {
        const apiUrl = `https://api.github.com/repos/${detection.id}/${detection.secondaryId}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Stacklume-App',
          },
        });
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.full_name || `${detection.id}/${detection.secondaryId}`,
            description: data.description || null,
            imageUrl: ogImageUrl,
            faviconUrl: 'https://github.com/favicon.ico',
            siteName: 'GitHub',
            author: data.owner?.login || null,
            platform: 'github',
            contentType: 'code',
            platformLabel: 'GitHub',
            platformColor: '#181717',
            platformIcon: 'Github',
          };
        }
      } catch {
        // Fall through to fallback
      }

      // Fallback with OpenGraph image
      return {
        title: `${detection.id}/${detection.secondaryId}`,
        description: null,
        imageUrl: ogImageUrl,
        faviconUrl: 'https://github.com/favicon.ico',
        siteName: 'GitHub',
        author: detection.id,
        platform: 'github',
        contentType: 'code',
        platformLabel: 'GitHub',
        platformColor: '#181717',
        platformIcon: 'Github',
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Parse HTML using cheerio for robust metadata extraction
function parseMetaTagsWithCheerio(html: string, baseUrl: URL): {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  author: string | null;
} {
  const $ = cheerio.load(html);

  // Helper to resolve relative URLs
  const resolveUrl = (urlStr: string | undefined): string | null => {
    if (!urlStr) return null;
    try {
      // Handle protocol-relative URLs
      if (urlStr.startsWith('//')) {
        return `https:${urlStr}`;
      }
      // Handle absolute URLs
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        return urlStr;
      }
      // Handle relative URLs
      return new URL(urlStr, baseUrl.origin).toString();
    } catch {
      return null;
    }
  };

  // Get meta content by various attribute combinations
  const getMeta = (names: string[]): string | null => {
    for (const name of names) {
      // Try property attribute (OpenGraph)
      let content = $(`meta[property="${name}"]`).attr('content');
      if (content) return content.trim();

      // Try name attribute
      content = $(`meta[name="${name}"]`).attr('content');
      if (content) return content.trim();

      // Try itemprop attribute (Schema.org)
      content = $(`meta[itemprop="${name}"]`).attr('content');
      if (content) return content.trim();
    }
    return null;
  };

  // Extract title
  const title = getMeta(['og:title', 'twitter:title', 'title'])
    || $('title').first().text().trim()
    || null;

  // Extract description
  const description = getMeta(['og:description', 'twitter:description', 'description'])
    || null;

  // Extract image URL
  const imageUrlRaw = getMeta(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']);
  const imageUrl = resolveUrl(imageUrlRaw || undefined);

  // Extract site name
  const siteName = getMeta(['og:site_name', 'application-name', 'al:ios:app_name', 'al:android:app_name'])
    || null;

  // Extract author
  const author = getMeta(['author', 'article:author', 'twitter:creator', 'og:article:author'])
    || $('a[rel="author"]').first().text().trim()
    || null;

  // Extract favicon - try multiple approaches
  let faviconUrl: string | null = null;

  // Priority order for favicons
  const faviconSelectors = [
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="icon"][sizes="192x192"]',
    'link[rel="icon"][sizes="128x128"]',
    'link[rel="icon"][sizes="96x96"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
  ];

  for (const selector of faviconSelectors) {
    const href = $(selector).first().attr('href');
    if (href) {
      faviconUrl = resolveUrl(href);
      if (faviconUrl) break;
    }
  }

  // Fallback to default favicon
  if (!faviconUrl) {
    faviconUrl = `${baseUrl.origin}/favicon.ico`;
  }

  return {
    title,
    description,
    imageUrl,
    faviconUrl,
    siteName,
    author,
  };
}

// Scrape website using fetch + cheerio (works on Vercel serverless)
async function scrapeWithFetch(url: URL, detection: ReturnType<typeof detectPlatform>): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Stacklume/1.0; +https://stacklume.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const metadata = parseMetaTagsWithCheerio(html, url);

    log.debug({
      url: url.toString(),
      title: metadata.title,
      hasImage: !!metadata.imageUrl,
      hasDescription: !!metadata.description,
    }, "Scraped metadata with cheerio");

    return {
      title: metadata.title || url.hostname,
      description: metadata.description,
      imageUrl: metadata.imageUrl,
      faviconUrl: metadata.faviconUrl || `${url.origin}/favicon.ico`,
      siteName: metadata.siteName,
      author: metadata.author,
      platform: detection.platform,
      contentType: detection.contentType,
      platformLabel: detection.label,
      platformColor: detection.color,
      platformIcon: detection.icon,
    };
  } catch (error) {
    log.warn({ error, url: url.toString() }, "Error fetching page for scrape");

    // Return basic info if scraping fails
    return {
      title: url.hostname,
      description: null,
      imageUrl: detection.directThumbnailUrl || null,
      faviconUrl: `${url.origin}/favicon.ico`,
      siteName: url.hostname,
      author: null,
      platform: detection.platform,
      contentType: detection.contentType,
      platformLabel: detection.label,
      platformColor: detection.color,
      platformIcon: detection.icon,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL es requerida" }, { status: 400 });
    }

    // Check cache first (1 hour TTL)
    const cachedResult = scrapeCache.get(url);
    if (cachedResult) {
      log.debug({ url }, "Returning cached scrape result");
      return NextResponse.json(cachedResult);
    }

    // SSRF Protection: Validate URL
    const ssrfCheck = await validateUrlForSSRF(url);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: `Security validation failed: ${ssrfCheck.reason}` },
        { status: 403 }
      );
    }

    const validUrl = ssrfCheck.validUrl!;

    // Detect platform
    const detection = detectPlatform(url);

    // Try platform-specific APIs first (faster & more reliable)
    const platformResult = await scrapeWithAPIs(url, detection);
    if (platformResult && platformResult.title) {
      const result: ScrapeResult = {
        title: platformResult.title || validUrl.hostname,
        description: platformResult.description || null,
        imageUrl: platformResult.imageUrl || null,
        faviconUrl: platformResult.faviconUrl || `${validUrl.origin}/favicon.ico`,
        siteName: platformResult.siteName || null,
        author: platformResult.author || null,
        platform: platformResult.platform || detection.platform,
        contentType: platformResult.contentType || detection.contentType,
        platformLabel: platformResult.platformLabel || detection.label,
        platformColor: platformResult.platformColor || detection.color,
        platformIcon: platformResult.platformIcon || detection.icon,
      };

      scrapeCache.set(url, result);
      log.debug({ url, platform: result.platform }, "Cached platform API scrape result");
      return NextResponse.json(result);
    }

    // Fall back to cheerio HTML scraping
    const result = await scrapeWithFetch(validUrl, detection);

    scrapeCache.set(url, result);
    log.debug({ url }, "Cached cheerio scrape result");

    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, "Scrape error");
    return NextResponse.json(
      { error: "Error al obtener metadatos" },
      { status: 500 }
    );
  }
}
