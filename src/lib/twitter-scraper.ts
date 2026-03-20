/**
 * Extrae contenido de tweets/hilos de X (Twitter) sin necesidad de API key.
 * Estrategia de 3 capas: FxTwitter → vxTwitter → Syndication API.
 *
 * Ref: https://github.com/FxEmbed/FxEmbed
 *      https://github.com/dylanpdx/BetterTwitFix
 *      https://github.com/vercel/react-tweet
 */

export interface TweetData {
  id: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  likes: number;
  retweets: number;
  replies: number;
  createdAt: string;
  lang: string;
  /** URLs encontradas en el texto del tweet */
  mentionedUrls: string[];
  /** URLs de imágenes/media del tweet */
  mediaUrls: string[];
  /** Si es respuesta a otro tweet */
  isReply: boolean;
}

/** Extrae el ID del tweet de una URL de twitter.com o x.com */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match?.[1] ?? null;
}

/** Extrae el handle del autor de la URL */
function extractHandle(url: string): string {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status/);
  return match?.[1] ?? "i";
}

/** Extrae URLs limpias del texto de un tweet */
function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const matches = text.match(urlRegex) || [];
  // Filtrar t.co (wrappers de Twitter) y URLs de media de Twitter
  return matches.filter(
    (u) => !u.includes("t.co/") && !u.includes("pic.twitter.com")
  );
}

// ─── Capa 1: FxTwitter API ──────────────────────────────────────────────────

async function fetchFromFxTwitter(
  tweetId: string,
  handle: string
): Promise<TweetData | null> {
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/${handle}/status/${tweetId}`,
      {
        headers: { "User-Agent": "Stacklume/0.3" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const tweet = data.tweet;
    if (!tweet) return null;

    const mentionedUrls: string[] = [];
    // FxTwitter incluye URLs expandidas en el texto
    if (tweet.text) mentionedUrls.push(...extractUrlsFromText(tweet.text));

    return {
      id: tweet.id,
      text: tweet.text ?? "",
      authorName: tweet.author?.name ?? handle,
      authorHandle: tweet.author?.screen_name ?? handle,
      authorAvatar: tweet.author?.avatar_url ?? "",
      likes: tweet.likes ?? 0,
      retweets: tweet.retweets ?? 0,
      replies: tweet.replies ?? 0,
      createdAt: tweet.created_at ?? "",
      lang: tweet.lang ?? "en",
      mentionedUrls,
      mediaUrls: tweet.media?.photos?.map((p: { url: string }) => p.url) ?? [],
      isReply: !!tweet.replying_to,
    };
  } catch {
    return null;
  }
}

// ─── Capa 2: vxTwitter API ──────────────────────────────────────────────────

async function fetchFromVxTwitter(
  tweetId: string,
  handle: string
): Promise<TweetData | null> {
  try {
    const res = await fetch(
      `https://api.vxtwitter.com/${handle}/status/${tweetId}`,
      {
        headers: { "User-Agent": "Stacklume/0.3" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const mentionedUrls: string[] = [];
    if (data.text) mentionedUrls.push(...extractUrlsFromText(data.text));

    return {
      id: data.tweetID ?? tweetId,
      text: data.text ?? "",
      authorName: data.user_name ?? handle,
      authorHandle: data.user_screen_name ?? handle,
      authorAvatar: data.user_profile_image_url ?? "",
      likes: data.likes ?? 0,
      retweets: data.retweets ?? 0,
      replies: data.replies ?? 0,
      createdAt: data.date ?? "",
      lang: data.lang ?? "en",
      mentionedUrls,
      mediaUrls: data.mediaURLs ?? [],
      isReply: false,
    };
  } catch {
    return null;
  }
}

// ─── Capa 3: Twitter Syndication API ────────────────────────────────────────

function getSyndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, "");
}

async function fetchFromSyndication(
  tweetId: string,
  handle: string
): Promise<TweetData | null> {
  try {
    const token = getSyndicationToken(tweetId);
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${token}`,
      {
        headers: {
          "User-Agent": "Stacklume/0.3",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const mentionedUrls: string[] = [];
    // Syndication API incluye entities con URLs expandidas
    if (data.entities?.urls) {
      for (const u of data.entities.urls) {
        if (u.expanded_url && !u.expanded_url.includes("t.co/")) {
          mentionedUrls.push(u.expanded_url);
        }
      }
    }
    if (data.text) {
      mentionedUrls.push(
        ...extractUrlsFromText(data.text).filter(
          (u) => !mentionedUrls.includes(u)
        )
      );
    }

    return {
      id: tweetId,
      text: data.text ?? "",
      authorName: data.user?.name ?? handle,
      authorHandle: data.user?.screen_name ?? handle,
      authorAvatar: data.user?.profile_image_url_https ?? "",
      likes: data.favorite_count ?? 0,
      retweets: 0, // Syndication no devuelve retweets
      replies: data.conversation_count ?? 0,
      createdAt: data.created_at ?? "",
      lang: data.lang ?? "en",
      mentionedUrls,
      mediaUrls:
        data.mediaDetails?.map(
          (m: { media_url_https: string }) => m.media_url_https
        ) ?? [],
      isReply: !!data.in_reply_to_status_id_str,
    };
  } catch {
    return null;
  }
}

// ─── Función principal: fallback en 3 capas ────────────────────────────────

export async function scrapeTweet(url: string): Promise<TweetData | null> {
  const tweetId = extractTweetId(url);
  if (!tweetId) return null;

  const handle = extractHandle(url);

  // Capa 1: FxTwitter (más datos)
  const fx = await fetchFromFxTwitter(tweetId, handle);
  if (fx) return fx;

  // Capa 2: vxTwitter (alternativa)
  const vx = await fetchFromVxTwitter(tweetId, handle);
  if (vx) return vx;

  // Capa 3: Syndication (más estable pero menos datos)
  const syn = await fetchFromSyndication(tweetId, handle);
  if (syn) return syn;

  return null;
}
