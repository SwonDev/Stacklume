import { NextRequest, NextResponse } from "next/server";
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

// Check if a YouTube thumbnail exists
async function getYouTubeThumbnail(videoId: string): Promise<string> {
  // Try thumbnail qualities in order of preference
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];

  for (const quality of qualities) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      // Check if the image exists and is not the default placeholder (120x90)
      const contentLength = response.headers.get('content-length');
      if (response.ok && contentLength && parseInt(contentLength) > 1000) {
        return url;
      }
    } catch {
      continue;
    }
  }

  // Fallback to hqdefault which always exists
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Platform-specific scrapers using APIs (no browser needed)
async function scrapeWithAPIs(url: string, detection: ReturnType<typeof detectPlatform>): Promise<Partial<ScrapeResult> | null> {
  try {
    // YouTube - use oEmbed API + thumbnail check
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

      // Get the best available thumbnail
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
        // Fallback
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

    // GitHub - use API for repo info
    if (detection.platform === 'github' && detection.id && detection.secondaryId) {
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
            imageUrl: data.owner?.avatar_url || null,
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
        // Fall through
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Parse HTML to extract meta tags (simple regex-based parser for serverless)
function parseMetaTags(html: string): {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  author: string | null;
} {
  const result = {
    title: null as string | null,
    description: null as string | null,
    imageUrl: null as string | null,
    faviconUrl: null as string | null,
    siteName: null as string | null,
    author: null as string | null,
  };

  // Helper to extract content from meta tags
  const getMetaContent = (patterns: RegExp[]): string | null => {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Decode HTML entities
        return match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      }
    }
    return null;
  };

  // Title
  result.title = getMetaContent([
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i,
    /<meta\s+(?:property|name)=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:title["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);

  // Description
  result.description = getMetaContent([
    /<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i,
    /<meta\s+(?:property|name)=["']twitter:description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:description["']/i,
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i,
  ]);

  // Image URL
  result.imageUrl = getMetaContent([
    /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i,
    /<meta\s+(?:property|name)=["']og:image:url["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image:url["']/i,
    /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i,
  ]);

  // Site name
  result.siteName = getMetaContent([
    /<meta\s+(?:property|name)=["']og:site_name["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:site_name["']/i,
    /<meta\s+name=["']application-name["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']application-name["']/i,
  ]);

  // Author
  result.author = getMetaContent([
    /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']author["']/i,
    /<meta\s+(?:property|name)=["']article:author["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']article:author["']/i,
  ]);

  // Favicon
  result.faviconUrl = getMetaContent([
    /<link\s+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i,
  ]);

  return result;
}

// Scrape website using fetch + HTML parsing (works on Vercel serverless)
async function scrapeWithFetch(url: URL, detection: ReturnType<typeof detectPlatform>): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const metadata = parseMetaTags(html);

    // Fix relative URLs
    const fixUrl = (urlStr: string | null): string | null => {
      if (!urlStr) return null;
      if (urlStr.startsWith('//')) return `https:${urlStr}`;
      if (urlStr.startsWith('/')) return `${url.origin}${urlStr}`;
      if (!urlStr.startsWith('http')) return `${url.origin}/${urlStr}`;
      return urlStr;
    };

    return {
      title: metadata.title || url.hostname,
      description: metadata.description,
      imageUrl: fixUrl(metadata.imageUrl),
      faviconUrl: fixUrl(metadata.faviconUrl) || `${url.origin}/favicon.ico`,
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

    // SSRF Protection: Validate URL and check for private IPs
    const ssrfCheck = await validateUrlForSSRF(url);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: `Security validation failed: ${ssrfCheck.reason}` },
        { status: 403 }
      );
    }

    // Use the validated URL from SSRF check
    const validUrl = ssrfCheck.validUrl!;

    // Detect platform first
    const detection = detectPlatform(url);

    // Try platform-specific scraping with APIs first (faster & more reliable)
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
      // Cache the result for 1 hour
      scrapeCache.set(url, result);
      log.debug({ url }, "Cached platform API scrape result");
      return NextResponse.json(result);
    }

    // Fall back to fetch + HTML parsing for other sites
    const result = await scrapeWithFetch(validUrl, detection);

    // Cache the result for 1 hour
    scrapeCache.set(url, result);
    log.debug({ url }, "Cached fetch scrape result");

    return NextResponse.json(result);
  } catch (error) {
    log.error({ error }, "Scrape error");
    return NextResponse.json(
      { error: "Error al obtener metadatos" },
      { status: 500 }
    );
  }
}
