import type { Link, Category, Tag, LinkTag } from "@/lib/db/schema";

interface ExportData {
  links: Link[];
  categories: Category[];
  tags: Tag[];
  linkTags: LinkTag[];
}

// Color mapping for tags and categories
const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  orange: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  amber: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  yellow: { bg: "#fefce8", text: "#ca8a04", border: "#fef08a" },
  lime: { bg: "#f7fee7", text: "#65a30d", border: "#d9f99d" },
  green: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  emerald: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  teal: { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" },
  cyan: { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
  sky: { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" },
  blue: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  indigo: { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" },
  violet: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  purple: { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },
  fuchsia: { bg: "#fdf4ff", text: "#c026d3", border: "#f5d0fe" },
  pink: { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8" },
  rose: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  slate: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  gray: { bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" },
  zinc: { bg: "#fafafa", text: "#52525b", border: "#e4e4e7" },
  stone: { bg: "#fafaf9", text: "#57534e", border: "#e7e5e4" },
};

const CATEGORY_COLORS: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#6b7280",
  zinc: "#71717a",
  stone: "#78716c",
  gold: "#d4a853",
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTagsForLink(linkId: string, linkTags: LinkTag[], tags: Tag[]): Tag[] {
  const tagIds = linkTags.filter((lt) => lt.linkId === linkId).map((lt) => lt.tagId);
  return tags.filter((t) => tagIds.includes(t.id));
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Generate beautiful visual HTML export
export function generateVisualHTML(data: ExportData): string {
  const { links, categories, tags, linkTags } = data;
  const exportDate = formatDate(new Date());

  // Group links by category
  const uncategorized = links.filter((link) => !link.categoryId);
  const categorized = new Map<string, Link[]>();

  links.forEach((link) => {
    if (link.categoryId) {
      const existing = categorized.get(link.categoryId) || [];
      existing.push(link);
      categorized.set(link.categoryId, existing);
    }
  });

  // Statistics
  const totalLinks = links.length;
  const totalCategories = categories.length;
  const totalTags = tags.length;
  const favoriteLinks = links.filter((l) => l.isFavorite).length;

  // Generate category sections HTML
  let categorySectionsHTML = "";

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  sortedCategories.forEach((category) => {
    const categoryLinks = categorized.get(category.id) || [];
    if (categoryLinks.length === 0) return;

    const categoryColor = CATEGORY_COLORS[category.color || "indigo"] || "#6366f1";
    const sortedLinks = [...categoryLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    categorySectionsHTML += `
      <section class="category-section">
        <div class="category-header" style="border-left-color: ${categoryColor}">
          <div class="category-icon" style="background-color: ${categoryColor}20; color: ${categoryColor}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="category-info">
            <h2>${escapeHtml(category.name)}</h2>
            ${category.description ? `<p>${escapeHtml(category.description)}</p>` : ""}
          </div>
          <span class="category-count">${categoryLinks.length} enlaces</span>
        </div>
        <div class="links-grid">
          ${sortedLinks.map((link) => generateLinkCardHTML(link, linkTags, tags)).join("")}
        </div>
      </section>
    `;
  });

  // Add uncategorized section
  if (uncategorized.length > 0) {
    categorySectionsHTML += `
      <section class="category-section">
        <div class="category-header" style="border-left-color: #6b7280">
          <div class="category-icon" style="background-color: #6b728020; color: #6b7280">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="category-info">
            <h2>Sin categoria</h2>
            <p>Enlaces sin asignar a una categoria</p>
          </div>
          <span class="category-count">${uncategorized.length} enlaces</span>
        </div>
        <div class="links-grid">
          ${uncategorized.map((link) => generateLinkCardHTML(link, linkTags, tags)).join("")}
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stacklume - Mis Enlaces Guardados</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-card: #1a1a24;
      --bg-card-hover: #22222e;
      --text-primary: #f5f5f7;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --border: #27272a;
      --accent: #d4a853;
      --accent-light: #e5c584;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .header {
      text-align: center;
      padding: 3rem 2rem;
      background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0a0a0f;
    }

    .logo-text {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    /* Stats */
    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
      padding: 1rem 2rem;
      background: var(--bg-card);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    /* Category Section */
    .category-section {
      margin-bottom: 3rem;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: var(--bg-secondary);
      border-radius: 16px;
      border-left: 4px solid;
      margin-bottom: 1.5rem;
    }

    .category-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .category-info {
      flex: 1;
    }

    .category-info h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .category-info p {
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .category-count {
      padding: 0.5rem 1rem;
      background: var(--bg-card);
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    /* Links Grid */
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1rem;
    }

    /* Link Card */
    .link-card {
      background: var(--bg-card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .link-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .link-card a {
      text-decoration: none;
      color: inherit;
    }

    .link-preview {
      width: 100%;
      height: 160px;
      object-fit: cover;
      background: var(--bg-secondary);
    }

    .link-content {
      padding: 1rem;
    }

    .link-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .link-favicon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      flex-shrink: 0;
      background: var(--bg-secondary);
    }

    .link-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .link-title {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .link-url {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .link-description {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .link-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .link-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .tag {
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 500;
      border: 1px solid;
    }

    .platform-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      color: white;
    }

    .favorite-badge {
      color: #eab308;
      font-size: 0.875rem;
    }

    .link-date {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 3rem 2rem;
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }

    .footer p {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .footer a {
      color: var(--accent);
      text-decoration: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .header {
        padding: 2rem 1rem;
      }

      .stats {
        gap: 1rem;
      }

      .stat {
        padding: 0.75rem 1.25rem;
      }

      .links-grid {
        grid-template-columns: 1fr;
      }

      .category-header {
        flex-wrap: wrap;
      }
    }

    /* Print styles */
    @media print {
      body {
        background: white;
        color: #1a1a1a;
      }

      .link-card {
        break-inside: avoid;
        border: 1px solid #e5e5e5;
      }

      .header {
        background: none;
        border-bottom: 2px solid #e5e5e5;
      }

      .stat {
        border: 1px solid #e5e5e5;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">
      <div class="logo-icon">S</div>
      <span class="logo-text">Stacklume</span>
    </div>
    <p class="header-subtitle">Exportado el ${exportDate}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalLinks}</div>
        <div class="stat-label">Enlaces</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalCategories}</div>
        <div class="stat-label">Categorias</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalTags}</div>
        <div class="stat-label">Etiquetas</div>
      </div>
      <div class="stat">
        <div class="stat-value">${favoriteLinks}</div>
        <div class="stat-label">Favoritos</div>
      </div>
    </div>
  </header>

  <main class="container">
    ${categorySectionsHTML}
  </main>

  <footer class="footer">
    <p>Generado con <a href="#">Stacklume</a> - Tu gestor de enlaces personal</p>
  </footer>
</body>
</html>`;
}

function generateLinkCardHTML(link: Link, linkTags: LinkTag[], tags: Tag[]): string {
  const linkTagsList = getTagsForLink(link.id, linkTags, tags);
  const hostname = getHostname(link.url);
  const createdDate = formatDate(link.createdAt);

  const tagsHTML = linkTagsList
    .slice(0, 3)
    .map((tag) => {
      const colors = TAG_COLORS[tag.color || "blue"] || TAG_COLORS.blue;
      return `<span class="tag" style="background: ${colors.bg}; color: ${colors.text}; border-color: ${colors.border}">${escapeHtml(tag.name)}</span>`;
    })
    .join("");

  const platformBadge =
    link.platform && link.platform !== "generic"
      ? `<span class="platform-badge" style="background: ${link.platformColor || "#6b7280"}">${escapeHtml(link.contentType || link.platform)}</span>`
      : "";

  const favoriteIcon = link.isFavorite ? `<span class="favorite-badge" title="Favorito">★</span>` : "";

  return `
    <article class="link-card">
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
        ${link.imageUrl ? `<img class="link-preview" src="${escapeHtml(link.imageUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ""}
        <div class="link-content">
          <div class="link-header">
            ${link.faviconUrl ? `<img class="link-favicon" src="${escapeHtml(link.faviconUrl)}" alt="" onerror="this.style.display='none'">` : '<div class="link-favicon"></div>'}
            <div class="link-title-wrap">
              <h3 class="link-title">${escapeHtml(link.title)}</h3>
              <span class="link-url">${escapeHtml(hostname)}</span>
            </div>
            ${favoriteIcon}
          </div>
          ${link.description ? `<p class="link-description">${escapeHtml(link.description)}</p>` : ""}
          <div class="link-meta">
            <div class="link-tags">
              ${tagsHTML}
              ${platformBadge}
            </div>
            <span class="link-date">${createdDate}</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

// Generate PDF-optimized HTML with theme support
export function generatePDFHTML(data: ExportData, theme: "light" | "dark" = "dark"): string {
  const { links, categories, tags, linkTags } = data;
  const exportDate = formatDate(new Date());
  const exportTime = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // Theme colors
  const isDark = theme === "dark";
  const colors = {
    bg: isDark ? "#0a0a0f" : "#ffffff",
    bgSecondary: isDark ? "#12121a" : "#f8fafc",
    bgCard: isDark ? "#1a1a24" : "#ffffff",
    bgCardAlt: isDark ? "#16161e" : "#f1f5f9",
    text: isDark ? "#f5f5f7" : "#1a1a2e",
    textSecondary: isDark ? "#a1a1aa" : "#64748b",
    textMuted: isDark ? "#71717a" : "#94a3b8",
    border: isDark ? "#27272a" : "#e2e8f0",
    borderLight: isDark ? "#3f3f46" : "#cbd5e1",
    accent: "#d4a853",
    accentLight: "#e5c584",
    accentDark: "#b8923f",
  };

  // Group links by category
  const uncategorized = links.filter((link) => !link.categoryId);
  const categorized = new Map<string, Link[]>();

  links.forEach((link) => {
    if (link.categoryId) {
      const existing = categorized.get(link.categoryId) || [];
      existing.push(link);
      categorized.set(link.categoryId, existing);
    }
  });

  // Statistics
  const totalLinks = links.length;
  const totalCategories = categories.length;
  const totalTags = tags.length;
  const favoriteLinks = links.filter((l) => l.isFavorite).length;
  const platformCounts = new Map<string, number>();
  links.forEach((l) => {
    if (l.platform && l.platform !== "generic") {
      platformCounts.set(l.platform, (platformCounts.get(l.platform) || 0) + 1);
    }
  });

  // Generate table of contents
  const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let tocHTML = sortedCategories
    .filter((cat) => (categorized.get(cat.id) || []).length > 0)
    .map((cat, idx) => {
      const catLinks = categorized.get(cat.id) || [];
      const catColor = CATEGORY_COLORS[cat.color || "indigo"] || "#6366f1";
      return `<div class="toc-item">
        <span class="toc-number" style="background: ${catColor};">${idx + 1}</span>
        <span class="toc-name">${escapeHtml(cat.name)}</span>
        <span class="toc-dots"></span>
        <span class="toc-count">${catLinks.length}</span>
      </div>`;
    })
    .join("");

  if (uncategorized.length > 0) {
    tocHTML += `<div class="toc-item">
      <span class="toc-number" style="background: #6b7280;">${sortedCategories.length + 1}</span>
      <span class="toc-name">Sin categoría</span>
      <span class="toc-dots"></span>
      <span class="toc-count">${uncategorized.length}</span>
    </div>`;
  }

  // Generate category sections HTML
  let categorySectionsHTML = "";
  let categoryIndex = 0;

  sortedCategories.forEach((category) => {
    const categoryLinks = categorized.get(category.id) || [];
    if (categoryLinks.length === 0) return;
    categoryIndex++;

    const categoryColor = CATEGORY_COLORS[category.color || "indigo"] || "#6366f1";
    const sortedLinks = [...categoryLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    categorySectionsHTML += `
      <section class="category-section">
        <div class="category-header">
          <div class="category-badge" style="background: ${categoryColor};">
            <span class="category-number">${categoryIndex}</span>
          </div>
          <div class="category-info">
            <h2 class="category-title">${escapeHtml(category.name)}</h2>
            ${category.description ? `<p class="category-desc">${escapeHtml(category.description)}</p>` : ""}
          </div>
          <div class="category-stats">
            <span class="category-count">${categoryLinks.length}</span>
            <span class="category-label">enlaces</span>
          </div>
        </div>
        <div class="links-grid">
          ${sortedLinks.map((link, i) => generatePDFLinkCardHTML(link, linkTags, tags, i, colors, isDark)).join("")}
        </div>
      </section>
    `;
  });

  // Uncategorized
  if (uncategorized.length > 0) {
    categoryIndex++;
    categorySectionsHTML += `
      <section class="category-section">
        <div class="category-header">
          <div class="category-badge" style="background: #6b7280;">
            <span class="category-number">${categoryIndex}</span>
          </div>
          <div class="category-info">
            <h2 class="category-title">Sin categoría</h2>
            <p class="category-desc">Enlaces sin asignar a ninguna categoría</p>
          </div>
          <div class="category-stats">
            <span class="category-count">${uncategorized.length}</span>
            <span class="category-label">enlaces</span>
          </div>
        </div>
        <div class="links-grid">
          ${uncategorized.map((link, i) => generatePDFLinkCardHTML(link, linkTags, tags, i, colors, isDark)).join("")}
        </div>
      </section>
    `;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stacklume - Colección de Enlaces</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      color: ${colors.text};
      background: ${colors.bg};
      line-height: 1.6;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* ===== COVER PAGE ===== */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      background: ${isDark
        ? `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgSecondary} 50%, ${colors.bg} 100%)`
        : `linear-gradient(135deg, #fefefe 0%, #f8f9fa 50%, #fefefe 100%)`};
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .cover::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 30%, ${colors.accent}15 0%, transparent 50%),
                  radial-gradient(circle at 70% 70%, ${colors.accent}10 0%, transparent 50%);
      pointer-events: none;
    }

    .cover-content {
      position: relative;
      z-index: 1;
    }

    .logo-wrapper {
      margin-bottom: 40px;
    }

    .logo-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 20px 60px ${colors.accent}40;
    }

    .logo-icon svg {
      width: 50px;
      height: 50px;
      fill: ${isDark ? colors.bg : "#ffffff"};
    }

    .logo-text {
      font-size: 48px;
      font-weight: 800;
      background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -1px;
    }

    .cover-title {
      font-size: 28px;
      font-weight: 300;
      color: ${colors.textSecondary};
      margin-bottom: 60px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 60px;
      width: 100%;
      max-width: 700px;
    }

    .stat-card {
      background: ${colors.bgCard};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      padding: 24px 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 800;
      color: ${colors.accent};
      line-height: 1;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 500;
      color: ${colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-meta {
      color: ${colors.textMuted};
      font-size: 12px;
    }

    .cover-meta span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .cover-meta span + span::before {
      content: '•';
      margin: 0 12px;
    }

    /* ===== TABLE OF CONTENTS ===== */
    .toc-page {
      padding: 60px 50px;
      page-break-after: always;
      background: ${colors.bg};
    }

    .toc-header {
      text-align: center;
      margin-bottom: 50px;
    }

    .toc-title {
      font-size: 24px;
      font-weight: 700;
      color: ${colors.text};
      margin-bottom: 8px;
    }

    .toc-subtitle {
      font-size: 13px;
      color: ${colors.textMuted};
    }

    .toc-list {
      max-width: 600px;
      margin: 0 auto;
    }

    .toc-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid ${colors.border};
    }

    .toc-number {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .toc-name {
      font-weight: 600;
      color: ${colors.text};
      flex-shrink: 0;
    }

    .toc-dots {
      flex: 1;
      border-bottom: 2px dotted ${colors.border};
      margin: 0 8px;
      height: 0;
    }

    .toc-count {
      font-weight: 700;
      color: ${colors.accent};
      font-size: 14px;
    }

    /* ===== MAIN CONTENT ===== */
    .container {
      padding: 40px 50px;
    }

    .category-section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px 24px;
      background: ${colors.bgSecondary};
      border-radius: 16px;
      margin-bottom: 24px;
      border: 1px solid ${colors.border};
    }

    .category-badge {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .category-number {
      font-size: 20px;
      font-weight: 800;
      color: white;
    }

    .category-info {
      flex: 1;
    }

    .category-title {
      font-size: 18px;
      font-weight: 700;
      color: ${colors.text};
      margin-bottom: 4px;
    }

    .category-desc {
      font-size: 12px;
      color: ${colors.textMuted};
    }

    .category-stats {
      text-align: right;
      flex-shrink: 0;
    }

    .category-count {
      display: block;
      font-size: 28px;
      font-weight: 800;
      color: ${colors.accent};
      line-height: 1;
    }

    .category-label {
      font-size: 10px;
      color: ${colors.textMuted};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ===== LINKS GRID ===== */
    .links-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .link-card {
      background: ${colors.bgCard};
      border: 1px solid ${colors.border};
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
      transition: all 0.2s;
    }

    .link-card:hover {
      border-color: ${colors.accent};
    }

    .link-preview-container {
      position: relative;
      width: 100%;
      height: 120px;
      background: ${colors.bgCardAlt};
      overflow: hidden;
    }

    .link-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .link-preview-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${colors.bgCardAlt} 0%, ${colors.bgSecondary} 100%);
    }

    .link-preview-placeholder svg {
      width: 32px;
      height: 32px;
      opacity: 0.3;
      fill: ${colors.textMuted};
    }

    .link-number {
      position: absolute;
      top: 8px;
      left: 8px;
      width: 24px;
      height: 24px;
      background: ${isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)"};
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      color: ${colors.textSecondary};
    }

    .link-favorite {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 18px;
    }

    .link-platform-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: white;
      letter-spacing: 0.5px;
    }

    .link-content {
      padding: 16px;
    }

    .link-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .link-favicon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      flex-shrink: 0;
      background: ${colors.bgCardAlt};
      object-fit: cover;
    }

    .link-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .link-title {
      font-size: 13px;
      font-weight: 600;
      color: ${colors.text};
      margin-bottom: 2px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .link-domain {
      font-size: 10px;
      color: ${colors.textMuted};
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .link-description {
      font-size: 11px;
      color: ${colors.textSecondary};
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
    }

    .link-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .tag {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }

    .link-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid ${colors.border};
    }

    .link-url {
      font-size: 9px;
      color: ${colors.accent};
      font-weight: 500;
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .link-date {
      font-size: 9px;
      color: ${colors.textMuted};
    }

    /* ===== FOOTER ===== */
    .footer {
      text-align: center;
      padding: 40px;
      border-top: 1px solid ${colors.border};
      margin-top: 40px;
      background: ${colors.bgSecondary};
    }

    .footer-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .footer-logo-icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .footer-logo-icon svg {
      width: 14px;
      height: 14px;
      fill: ${isDark ? colors.bg : "#ffffff"};
    }

    .footer-logo-text {
      font-size: 16px;
      font-weight: 700;
      color: ${colors.accent};
    }

    .footer-text {
      font-size: 11px;
      color: ${colors.textMuted};
    }

    /* ===== PRINT STYLES ===== */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .cover {
        page-break-after: always;
      }

      .toc-page {
        page-break-after: always;
      }

      .category-section {
        page-break-inside: avoid;
      }

      .link-card {
        page-break-inside: avoid;
      }
    }

    @page {
      margin: 12mm;
      size: A4;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-content">
      <div class="logo-wrapper">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="logo-text">Stacklume</div>
      </div>

      <h1 class="cover-title">Colección de Enlaces</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalLinks}</div>
          <div class="stat-label">Enlaces</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalCategories}</div>
          <div class="stat-label">Categorías</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalTags}</div>
          <div class="stat-label">Etiquetas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${favoriteLinks}</div>
          <div class="stat-label">Favoritos</div>
        </div>
      </div>

      <div class="cover-meta">
        <span>📅 ${exportDate}</span>
        <span>🕐 ${exportTime}</span>
      </div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="toc-page">
    <div class="toc-header">
      <h2 class="toc-title">Índice de Contenidos</h2>
      <p class="toc-subtitle">Organizado por categorías</p>
    </div>
    <div class="toc-list">
      ${tocHTML}
    </div>
  </div>

  <!-- MAIN CONTENT -->
  <div class="container">
    ${categorySectionsHTML}
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-logo">
      <div class="footer-logo-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="footer-logo-text">Stacklume</span>
    </div>
    <p class="footer-text">Tu gestor de enlaces personal • Generado automáticamente</p>
  </div>
</body>
</html>`;
}

function generatePDFLinkCardHTML(
  link: Link,
  linkTags: LinkTag[],
  tags: Tag[],
  index: number,
  _colors: Record<string, string>,
  _isDark: boolean
): string {
  const linkTagsList = getTagsForLink(link.id, linkTags, tags);
  const hostname = getHostname(link.url);
  const createdDate = formatDate(link.createdAt);

  const tagsHTML = linkTagsList
    .slice(0, 3)
    .map((tag) => {
      const tagColors = TAG_COLORS[tag.color || "blue"] || TAG_COLORS.blue;
      return `<span class="tag" style="background: ${tagColors.bg}; color: ${tagColors.text};">${escapeHtml(tag.name)}</span>`;
    })
    .join("");

  const platformBadge =
    link.platform && link.platform !== "generic"
      ? `<span class="link-platform-badge" style="background: ${link.platformColor || "#6b7280"}">${escapeHtml(link.contentType || link.platform)}</span>`
      : "";

  const favoriteIcon = link.isFavorite ? `<span class="link-favorite">⭐</span>` : "";

  const previewHTML = link.imageUrl
    ? `<img class="link-preview" src="${escapeHtml(link.imageUrl)}" alt="" onerror="this.parentElement.innerHTML='<div class=link-preview-placeholder><svg viewBox=\\'0 0 24 24\\'><path d=\\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\\'/></svg></div>'">`
    : `<div class="link-preview-placeholder">
        <svg viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>`;

  return `
    <article class="link-card">
      <div class="link-preview-container">
        ${previewHTML}
        <span class="link-number">${index + 1}</span>
        ${favoriteIcon}
        ${platformBadge}
      </div>
      <div class="link-content">
        <div class="link-header">
          ${link.faviconUrl ? `<img class="link-favicon" src="${escapeHtml(link.faviconUrl)}" alt="" onerror="this.style.display='none'">` : ""}
          <div class="link-title-wrap">
            <h3 class="link-title">${escapeHtml(link.title)}</h3>
            <span class="link-domain">🔗 ${escapeHtml(hostname)}</span>
          </div>
        </div>
        ${link.description ? `<p class="link-description">${escapeHtml(link.description.substring(0, 120))}${link.description.length > 120 ? "..." : ""}</p>` : ""}
        ${tagsHTML ? `<div class="link-tags">${tagsHTML}</div>` : ""}
        <div class="link-footer">
          <span class="link-url">${escapeHtml(link.url.substring(0, 40))}${link.url.length > 40 ? "..." : ""}</span>
          <span class="link-date">${createdDate}</span>
        </div>
      </div>
    </article>
  `;
}

// Original Netscape bookmark format (for browser import)
export function generateNetscapeHTML(data: ExportData): string {
  const { links, categories } = data;

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks - Stacklume Export</H1>
<DL><p>
`;

  // Group links by category
  const uncategorized = links.filter((link) => !link.categoryId);
  const categorized = new Map<string, Link[]>();

  links.forEach((link) => {
    if (link.categoryId) {
      const existing = categorized.get(link.categoryId) || [];
      existing.push(link);
      categorized.set(link.categoryId, existing);
    }
  });

  // Export categorized links
  categories.forEach((category) => {
    const categoryLinks = categorized.get(category.id) || [];
    if (categoryLinks.length > 0) {
      html += `    <DT><H3>${escapeHtml(category.name)}</H3>\n`;
      html += `    <DL><p>\n`;
      categoryLinks.forEach((link) => {
        const addDate = Math.floor(new Date(link.createdAt).getTime() / 1000);
        html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${link.faviconUrl ? ` ICON="${escapeHtml(link.faviconUrl)}"` : ""}>${escapeHtml(link.title)}</A>\n`;
        if (link.description) {
          html += `        <DD>${escapeHtml(link.description)}\n`;
        }
      });
      html += `    </DL><p>\n`;
    }
  });

  // Export uncategorized links
  if (uncategorized.length > 0) {
    html += `    <DT><H3>Sin categoria</H3>\n`;
    html += `    <DL><p>\n`;
    uncategorized.forEach((link) => {
      const addDate = Math.floor(new Date(link.createdAt).getTime() / 1000);
      html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${link.faviconUrl ? ` ICON="${escapeHtml(link.faviconUrl)}"` : ""}>${escapeHtml(link.title)}</A>\n`;
      if (link.description) {
        html += `        <DD>${escapeHtml(link.description)}\n`;
      }
    });
    html += `    </DL><p>\n`;
  }

  html += `</DL><p>`;

  return html;
}
