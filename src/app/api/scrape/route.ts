import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
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
  // New platform-specific fields
  platform: Platform;
  contentType: ContentType;
  platformLabel: string;
  platformColor: string;
  platformIcon: string;
}

// Platform-specific scrapers that don't need Playwright
async function scrapeWithoutBrowser(url: string, detection: ReturnType<typeof detectPlatform>): Promise<Partial<ScrapeResult> | null> {
  try {
    // YouTube - use direct thumbnail URL
    if (detection.platform === 'youtube' && detection.id) {
      const oEmbedUrl = detection.oEmbedUrl;
      if (oEmbedUrl) {
        const response = await fetch(oEmbedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title || 'YouTube Video',
            description: null,
            imageUrl: `https://img.youtube.com/vi/${detection.id}/maxresdefault.jpg`,
            faviconUrl: 'https://www.youtube.com/favicon.ico',
            siteName: 'YouTube',
            author: data.author_name || null,
            platform: 'youtube',
            contentType: 'video',
            platformLabel: 'YouTube',
            platformColor: '#FF0000',
            platformIcon: 'Youtube',
          };
        }
      }
      // Fallback to direct thumbnail
      return {
        title: 'YouTube Video',
        imageUrl: `https://img.youtube.com/vi/${detection.id}/hqdefault.jpg`,
        faviconUrl: 'https://www.youtube.com/favicon.ico',
        siteName: 'YouTube',
        platform: 'youtube',
        contentType: 'video',
        platformLabel: 'YouTube',
        platformColor: '#FF0000',
        platformIcon: 'Youtube',
      };
    }

    // Steam - use direct CDN URLs
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
        // Fallback to direct image
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
        // Fall through to browser scraping
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
        // Fall through to browser scraping
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
        // Fall through to browser scraping
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
        // Fall through to browser scraping
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
        // Fall through to browser scraping
      }
    }

    return null;
  } catch {
    return null;
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

    // Try platform-specific scraping without browser first (faster & more reliable)
    const platformResult = await scrapeWithoutBrowser(url, detection);
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
      log.debug({ url }, "Cached platform scrape result");
      return NextResponse.json(result);
    }

    // Fall back to Playwright for other sites
    const browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    try {
      await page.goto(validUrl.toString(), {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Extract metadata
      const metadata = await page.evaluate(() => {
        const getMetaContent = (selectors: string[]): string | null => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              const content =
                element.getAttribute("content") ||
                element.getAttribute("href") ||
                element.textContent;
              if (content) return content.trim();
            }
          }
          return null;
        };

        // Title
        const title =
          getMetaContent([
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
          ]) ||
          document.title ||
          "";

        // Description
        const description = getMetaContent([
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]',
        ]);

        // Image - try multiple sources
        const imageUrl = getMetaContent([
          'meta[property="og:image"]',
          'meta[property="og:image:url"]',
          'meta[property="og:image:secure_url"]',
          'meta[name="twitter:image"]',
          'meta[name="twitter:image:src"]',
          'meta[itemprop="image"]',
        ]);

        // Site name
        const siteName = getMetaContent([
          'meta[property="og:site_name"]',
          'meta[name="application-name"]',
        ]);

        // Author
        const author = getMetaContent([
          'meta[name="author"]',
          'meta[property="article:author"]',
          'meta[name="twitter:creator"]',
        ]);

        // Favicon - try multiple sources
        const faviconUrl =
          getMetaContent([
            'link[rel="icon"][sizes="192x192"]',
            'link[rel="icon"][sizes="128x128"]',
            'link[rel="apple-touch-icon"]',
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
          ]) || "/favicon.ico";

        // Type detection from Open Graph
        const ogType = getMetaContent(['meta[property="og:type"]']);

        return {
          title,
          description,
          imageUrl,
          faviconUrl,
          siteName,
          author,
          ogType,
        };
      });

      // Fix relative URLs
      const fixUrl = (urlStr: string | null): string | null => {
        if (!urlStr) return null;
        if (urlStr.startsWith("//")) return `https:${urlStr}`;
        if (urlStr.startsWith("/"))
          return `${validUrl.origin}${urlStr}`;
        if (!urlStr.startsWith("http")) return `${validUrl.origin}/${urlStr}`;
        return urlStr;
      };

      // Use direct thumbnail URL if available
      const finalImageUrl = detection.directThumbnailUrl || fixUrl(metadata.imageUrl);

      const result: ScrapeResult = {
        title: metadata.title || validUrl.hostname,
        description: metadata.description,
        imageUrl: finalImageUrl,
        faviconUrl: fixUrl(metadata.faviconUrl),
        siteName: metadata.siteName,
        author: metadata.author,
        platform: detection.platform,
        contentType: detection.contentType,
        platformLabel: detection.label,
        platformColor: detection.color,
        platformIcon: detection.icon,
      };

      await browser.close();

      // Cache the result for 1 hour
      scrapeCache.set(url, result);
      log.debug({ url }, "Cached browser scrape result");

      return NextResponse.json(result);
    } catch (pageError) {
      await browser.close();
      log.warn({ error: pageError, url: validUrl.toString() }, "Error loading page during scrape");

      // Return basic info if scraping fails, but still include platform info
      return NextResponse.json({
        title: validUrl.hostname,
        description: null,
        imageUrl: detection.directThumbnailUrl || null,
        faviconUrl: `${validUrl.origin}/favicon.ico`,
        siteName: validUrl.hostname,
        author: null,
        platform: detection.platform,
        contentType: detection.contentType,
        platformLabel: detection.label,
        platformColor: detection.color,
        platformIcon: detection.icon,
      });
    }
  } catch (error) {
    log.error({ error }, "Scrape error");
    return NextResponse.json(
      { error: "Error al obtener metadatos" },
      { status: 500 }
    );
  }
}
