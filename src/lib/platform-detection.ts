/**
 * Platform Detection Utility
 * Detects the platform/content type of a URL and extracts relevant IDs
 */

export type ContentType =
  | 'video'
  | 'game'
  | 'music'
  | 'code'
  | 'article'
  | 'social'
  | 'shopping'
  | 'image'
  | 'document'
  | 'tool'
  | 'website';

export type Platform =
  | 'youtube'
  | 'vimeo'
  | 'twitch'
  | 'steam'
  | 'epic'
  | 'gog'
  | 'itch'
  | 'spotify'
  | 'soundcloud'
  | 'apple-music'
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'codepen'
  | 'twitter'
  | 'reddit'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'
  | 'pinterest'
  | 'dribbble'
  | 'behance'
  | 'figma'
  | 'notion'
  | 'amazon'
  | 'ebay'
  | 'etsy'
  | 'medium'
  | 'dev-to'
  | 'hashnode'
  | 'stackoverflow'
  | 'wikipedia'
  | 'google-docs'
  | 'google-drive'
  | 'dropbox'
  | 'netflix'
  | 'disney-plus'
  | 'hbo'
  | 'generic';

export interface PlatformDetectionResult {
  platform: Platform;
  contentType: ContentType;
  id?: string;
  secondaryId?: string;
  directThumbnailUrl?: string;
  oEmbedUrl?: string;
  apiEndpoint?: string;
  color: string;
  icon: string;
  label: string;
}

interface PlatformPattern {
  pattern: RegExp;
  platform: Platform;
  contentType: ContentType;
  color: string;
  icon: string;
  label: string;
  extractId?: (match: RegExpMatchArray) => { id?: string; secondaryId?: string };
  getDirectThumbnail?: (id: string) => string;
  getOEmbedUrl?: (url: string) => string;
}

const platformPatterns: PlatformPattern[] = [
  // Video Platforms
  {
    pattern: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    platform: 'youtube',
    contentType: 'video',
    color: '#FF0000',
    icon: 'Youtube',
    label: 'YouTube',
    extractId: (match) => ({ id: match[1] }),
    getDirectThumbnail: (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    getOEmbedUrl: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    pattern: /vimeo\.com\/(\d+)/,
    platform: 'vimeo',
    contentType: 'video',
    color: '#1AB7EA',
    icon: 'Video',
    label: 'Vimeo',
    extractId: (match) => ({ id: match[1] }),
    getOEmbedUrl: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  },
  {
    pattern: /twitch\.tv\/(?:videos\/(\d+)|([a-zA-Z0-9_]+))/,
    platform: 'twitch',
    contentType: 'video',
    color: '#9146FF',
    icon: 'Twitch',
    label: 'Twitch',
    extractId: (match) => ({ id: match[1] || match[2] }),
  },
  {
    pattern: /netflix\.com\/(?:title|watch)\/(\d+)/,
    platform: 'netflix',
    contentType: 'video',
    color: '#E50914',
    icon: 'Film',
    label: 'Netflix',
    extractId: (match) => ({ id: match[1] }),
  },

  // Gaming Platforms
  {
    pattern: /store\.steampowered\.com\/app\/(\d+)/,
    platform: 'steam',
    contentType: 'game',
    color: '#1B2838',
    icon: 'Gamepad2',
    label: 'Steam',
    extractId: (match) => ({ id: match[1] }),
    getDirectThumbnail: (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
  },
  {
    pattern: /steamcommunity\.com\/(?:app|games)\/(\d+)/,
    platform: 'steam',
    contentType: 'game',
    color: '#1B2838',
    icon: 'Gamepad2',
    label: 'Steam Community',
    extractId: (match) => ({ id: match[1] }),
    getDirectThumbnail: (id) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
  },
  {
    pattern: /store\.epicgames\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?p(?:roduct)?\/([a-zA-Z0-9-]+)/,
    platform: 'epic',
    contentType: 'game',
    color: '#313131',
    icon: 'Gamepad2',
    label: 'Epic Games',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /gog\.com\/(?:en\/)?game\/([a-zA-Z0-9_-]+)/,
    platform: 'gog',
    contentType: 'game',
    color: '#86328A',
    icon: 'Gamepad2',
    label: 'GOG',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /itch\.io\/([a-zA-Z0-9_-]+)/,
    platform: 'itch',
    contentType: 'game',
    color: '#FA5C5C',
    icon: 'Gamepad2',
    label: 'itch.io',
    extractId: (match) => ({ id: match[1] }),
  },

  // Music Platforms
  {
    pattern: /open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
    platform: 'spotify',
    contentType: 'music',
    color: '#1DB954',
    icon: 'Music',
    label: 'Spotify',
    extractId: (match) => ({ id: match[2], secondaryId: match[1] }),
    getOEmbedUrl: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
  },
  {
    pattern: /soundcloud\.com\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?/,
    platform: 'soundcloud',
    contentType: 'music',
    color: '#FF5500',
    icon: 'Music',
    label: 'SoundCloud',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
    getOEmbedUrl: (url) => `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    pattern: /music\.apple\.com\/(?:[a-z]{2}\/)?(?:album|playlist|artist)\/[^\/]+\/(\d+)/,
    platform: 'apple-music',
    contentType: 'music',
    color: '#FC3C44',
    icon: 'Music',
    label: 'Apple Music',
    extractId: (match) => ({ id: match[1] }),
  },

  // Code Platforms
  {
    pattern: /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/,
    platform: 'github',
    contentType: 'code',
    color: '#181717',
    icon: 'Github',
    label: 'GitHub',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /gitlab\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/,
    platform: 'gitlab',
    contentType: 'code',
    color: '#FC6D26',
    icon: 'Gitlab',
    label: 'GitLab',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /bitbucket\.org\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/,
    platform: 'bitbucket',
    contentType: 'code',
    color: '#0052CC',
    icon: 'Code2',
    label: 'Bitbucket',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /codepen\.io\/([a-zA-Z0-9_-]+)(?:\/pen\/([a-zA-Z0-9]+))?/,
    platform: 'codepen',
    contentType: 'code',
    color: '#000000',
    icon: 'Codepen',
    label: 'CodePen',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
    getOEmbedUrl: (url) => `https://codepen.io/api/oembed?url=${encodeURIComponent(url)}&format=json`,
  },
  {
    pattern: /stackoverflow\.com\/questions\/(\d+)/,
    platform: 'stackoverflow',
    contentType: 'code',
    color: '#F48024',
    icon: 'HelpCircle',
    label: 'Stack Overflow',
    extractId: (match) => ({ id: match[1] }),
  },

  // Social Platforms
  {
    pattern: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)(?:\/status\/(\d+))?/,
    platform: 'twitter',
    contentType: 'social',
    color: '#000000',
    icon: 'Twitter',
    label: 'X (Twitter)',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
    getOEmbedUrl: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
  },
  {
    pattern: /reddit\.com\/r\/([a-zA-Z0-9_]+)(?:\/comments\/([a-zA-Z0-9]+))?/,
    platform: 'reddit',
    contentType: 'social',
    color: '#FF4500',
    icon: 'MessageCircle',
    label: 'Reddit',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
    getOEmbedUrl: (url) => `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`,
  },
  {
    pattern: /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/,
    platform: 'instagram',
    contentType: 'social',
    color: '#E4405F',
    icon: 'Instagram',
    label: 'Instagram',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /tiktok\.com\/@([a-zA-Z0-9_.-]+)(?:\/video\/(\d+))?/,
    platform: 'tiktok',
    contentType: 'social',
    color: '#000000',
    icon: 'Music2',
    label: 'TikTok',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /linkedin\.com\/(?:posts|pulse|in)\/([a-zA-Z0-9_-]+)/,
    platform: 'linkedin',
    contentType: 'social',
    color: '#0A66C2',
    icon: 'Linkedin',
    label: 'LinkedIn',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /facebook\.com\/(?:photo|watch|[a-zA-Z0-9.]+\/(?:posts|videos))\/([a-zA-Z0-9_-]+)/,
    platform: 'facebook',
    contentType: 'social',
    color: '#1877F2',
    icon: 'Facebook',
    label: 'Facebook',
    extractId: (match) => ({ id: match[1] }),
  },

  // Design Platforms
  {
    pattern: /pinterest\.com\/pin\/(\d+)/,
    platform: 'pinterest',
    contentType: 'image',
    color: '#E60023',
    icon: 'Image',
    label: 'Pinterest',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /dribbble\.com\/shots\/(\d+)/,
    platform: 'dribbble',
    contentType: 'image',
    color: '#EA4C89',
    icon: 'Dribbble',
    label: 'Dribbble',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /behance\.net\/gallery\/(\d+)/,
    platform: 'behance',
    contentType: 'image',
    color: '#1769FF',
    icon: 'Palette',
    label: 'Behance',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
    platform: 'figma',
    contentType: 'tool',
    color: '#F24E1E',
    icon: 'Figma',
    label: 'Figma',
    extractId: (match) => ({ id: match[1] }),
  },

  // Document/Tool Platforms
  {
    pattern: /notion\.so\/(?:[a-zA-Z0-9-]+\/)?([a-zA-Z0-9]+)/,
    platform: 'notion',
    contentType: 'document',
    color: '#000000',
    icon: 'FileText',
    label: 'Notion',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/,
    platform: 'google-docs',
    contentType: 'document',
    color: '#4285F4',
    icon: 'FileText',
    label: 'Google Docs',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /drive\.google\.com\/(?:file\/d|open\?id=)\/([a-zA-Z0-9_-]+)/,
    platform: 'google-drive',
    contentType: 'document',
    color: '#4285F4',
    icon: 'HardDrive',
    label: 'Google Drive',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /dropbox\.com\/(?:s|sh)\/([a-zA-Z0-9]+)/,
    platform: 'dropbox',
    contentType: 'document',
    color: '#0061FF',
    icon: 'Droplet',
    label: 'Dropbox',
    extractId: (match) => ({ id: match[1] }),
  },

  // Shopping Platforms
  {
    pattern: /amazon\.(?:com|co\.uk|de|fr|es|it|ca|com\.mx|com\.br|co\.jp|in|com\.au)\/(?:dp|gp\/product)\/([A-Z0-9]{10})/,
    platform: 'amazon',
    contentType: 'shopping',
    color: '#FF9900',
    icon: 'ShoppingCart',
    label: 'Amazon',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /ebay\.(?:com|co\.uk|de|fr|es|it|ca|com\.au)\/itm\/(\d+)/,
    platform: 'ebay',
    contentType: 'shopping',
    color: '#E53238',
    icon: 'ShoppingBag',
    label: 'eBay',
    extractId: (match) => ({ id: match[1] }),
  },
  {
    pattern: /etsy\.com\/listing\/(\d+)/,
    platform: 'etsy',
    contentType: 'shopping',
    color: '#F56400',
    icon: 'ShoppingBag',
    label: 'Etsy',
    extractId: (match) => ({ id: match[1] }),
  },

  // Article/Blog Platforms
  {
    pattern: /medium\.com\/@?([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/,
    platform: 'medium',
    contentType: 'article',
    color: '#000000',
    icon: 'BookOpen',
    label: 'Medium',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /dev\.to\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/,
    platform: 'dev-to',
    contentType: 'article',
    color: '#0A0A0A',
    icon: 'Code',
    label: 'DEV.to',
    extractId: (match) => ({ id: match[1], secondaryId: match[2] }),
  },
  {
    pattern: /hashnode\.dev\/([a-zA-Z0-9_-]+)/,
    platform: 'hashnode',
    contentType: 'article',
    color: '#2962FF',
    icon: 'Hash',
    label: 'Hashnode',
    extractId: (match) => ({ id: match[1] }),
  },

  // Reference
  {
    pattern: /(?:[a-z]{2,3}\.)?wikipedia\.org\/wiki\/([^?#]+)/,
    platform: 'wikipedia',
    contentType: 'article',
    color: '#000000',
    icon: 'BookOpen',
    label: 'Wikipedia',
    extractId: (match) => ({ id: decodeURIComponent(match[1]) }),
  },
];

/**
 * Detect platform and content type from a URL
 */
export function detectPlatform(url: string): PlatformDetectionResult {
  try {
    const _normalizedUrl = url.toLowerCase();

    for (const pattern of platformPatterns) {
      const match = url.match(pattern.pattern);
      if (match) {
        const ids = pattern.extractId?.(match) || {};

        return {
          platform: pattern.platform,
          contentType: pattern.contentType,
          id: ids.id,
          secondaryId: ids.secondaryId,
          directThumbnailUrl: ids.id && pattern.getDirectThumbnail
            ? pattern.getDirectThumbnail(ids.id)
            : undefined,
          oEmbedUrl: pattern.getOEmbedUrl
            ? pattern.getOEmbedUrl(url)
            : undefined,
          color: pattern.color,
          icon: pattern.icon,
          label: pattern.label,
        };
      }
    }

    // Generic website fallback
    return {
      platform: 'generic',
      contentType: 'website',
      color: '#6B7280',
      icon: 'Globe',
      label: 'Website',
    };
  } catch {
    return {
      platform: 'generic',
      contentType: 'website',
      color: '#6B7280',
      icon: 'Globe',
      label: 'Website',
    };
  }
}

/**
 * Get content type icon name
 */
export function getContentTypeIcon(contentType: ContentType): string {
  const icons: Record<ContentType, string> = {
    video: 'Play',
    game: 'Gamepad2',
    music: 'Music',
    code: 'Code',
    article: 'BookOpen',
    social: 'Users',
    shopping: 'ShoppingCart',
    image: 'Image',
    document: 'FileText',
    tool: 'Wrench',
    website: 'Globe',
  };
  return icons[contentType];
}

/**
 * Get content type label in Spanish
 */
export function getContentTypeLabel(contentType: ContentType): string {
  const labels: Record<ContentType, string> = {
    video: 'Video',
    game: 'Juego',
    music: 'Música',
    code: 'Código',
    article: 'Artículo',
    social: 'Social',
    shopping: 'Tienda',
    image: 'Imagen',
    document: 'Documento',
    tool: 'Herramienta',
    website: 'Web',
  };
  return labels[contentType];
}

/**
 * Get YouTube video ID from various URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get Steam App ID from URL
 */
export function getSteamAppId(url: string): string | null {
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Get direct thumbnail URL for known platforms
 */
export function getDirectThumbnailUrl(url: string): string | null {
  const detection = detectPlatform(url);
  return detection.directThumbnailUrl || null;
}

/**
 * Check if URL is from a video platform
 */
export function isVideoUrl(url: string): boolean {
  const detection = detectPlatform(url);
  return detection.contentType === 'video';
}

/**
 * Check if URL is from a gaming platform
 */
export function isGameUrl(url: string): boolean {
  const detection = detectPlatform(url);
  return detection.contentType === 'game';
}

/**
 * Check if URL is from a music platform
 */
export function isMusicUrl(url: string): boolean {
  const detection = detectPlatform(url);
  return detection.contentType === 'music';
}

/**
 * Generate platform badge data
 */
export function getPlatformBadge(url: string): {
  label: string;
  color: string;
  icon: string;
} | null {
  const detection = detectPlatform(url);
  if (detection.platform === 'generic') return null;

  return {
    label: detection.label,
    color: detection.color,
    icon: detection.icon,
  };
}
