import { NextResponse } from "next/server";

const FEED_URL = "https://tom-doerr.github.io/repo_posts/feed.xml";

interface TrendingRepo {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  repoUrl: string;
  repoName: string;
  imageUrl?: string;
}

// Extract GitHub repo URL from related link or content
function extractRepoUrl(entryContent: string): string {
  // Look for the related link with GitHub URL
  const relatedMatch = entryContent.match(/<link[^>]*rel="related"[^>]*href="([^"]*github\.com[^"]*)"/);
  if (relatedMatch) {
    return relatedMatch[1];
  }

  // Try to find GitHub URL in content
  const githubMatch = entryContent.match(/href="(https:\/\/github\.com\/[^"]+)"/);
  if (githubMatch) {
    return githubMatch[1];
  }

  return "";
}

// Extract repo name from GitHub URL
function extractRepoName(githubUrl: string): string {
  const match = githubUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
  return match ? match[1].replace(/\/$/, "") : "";
}

// Extract description from content
function extractDescription(content: string): string {
  // Look for the paragraph after the h1
  const descMatch = content.match(/<p>([^<]+)<\/p>\s*$/m);
  if (descMatch) {
    return descMatch[1].trim();
  }

  // Alternative: look for any paragraph that's not an image
  const paragraphs = content.match(/<p>(?!<img)([^<]+)<\/p>/g);
  if (paragraphs && paragraphs.length > 0) {
    const lastP = paragraphs[paragraphs.length - 1];
    const textMatch = lastP.match(/<p>([^<]+)<\/p>/);
    return textMatch ? textMatch[1].trim() : "";
  }

  return "";
}

// Extract image URL from content
function extractImageUrl(entryContent: string): string {
  const thumbnailMatch = entryContent.match(/<media:thumbnail[^>]*url="([^"]*)"/);
  if (thumbnailMatch) {
    return thumbnailMatch[1];
  }
  return "";
}

// Parse Atom feed XML
function parseAtomFeed(xmlText: string, maxItems: number): TrendingRepo[] {
  const items: TrendingRepo[] = [];

  // Parse Atom entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  let count = 0;

  while ((match = entryRegex.exec(xmlText)) !== null && count < maxItems) {
    const entryContent = match[1];

    // Extract title
    const titleMatch = entryContent.match(/<title>([^<]*)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled";

    // Extract link (the main page link)
    const linkMatch = entryContent.match(/<link[^>]*href="([^"]*)"[^>]*(?:\/?>|>)/);
    const link = linkMatch ? linkMatch[1].trim() : "";

    // Extract updated date
    const updatedMatch = entryContent.match(/<updated>([^<]*)<\/updated>/);
    const pubDate = updatedMatch ? updatedMatch[1].trim() : "";

    // Extract GitHub repo URL
    const repoUrl = extractRepoUrl(entryContent);
    const repoName = extractRepoName(repoUrl);

    // Extract content and description
    const contentMatch = entryContent.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/);
    const contentHtml = contentMatch ? contentMatch[1] : "";
    const description = extractDescription(contentHtml);

    // Extract image
    const imageUrl = extractImageUrl(entryContent);

    // Clean description
    const cleanDescription = description
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    items.push({
      title,
      description: cleanDescription,
      link,
      pubDate,
      repoUrl: repoUrl || link,
      repoName: repoName || title,
      imageUrl,
    });

    count++;
  }

  return items;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const maxItems = parseInt(searchParams.get("maxItems") || "10", 10);

    // Note: We don't use Next.js cache here because the feed is ~16MB
    // which exceeds the 2MB cache limit. The widget handles its own
    // client-side caching instead.
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "Stacklume/1.0 RSS Reader",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status}`);
    }

    const xmlText = await response.text();
    const repos = parseAtomFeed(xmlText, maxItems);

    if (repos.length === 0) {
      return NextResponse.json(
        { error: "No repositories found in feed" },
        { status: 404 }
      );
    }

    return NextResponse.json(repos);
  } catch (error) {
    console.error("GitHub trending fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending repositories" },
      { status: 500 }
    );
  }
}
