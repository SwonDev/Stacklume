import { create } from "zustand";
import type { Link, Category, Tag } from "@/lib/db/schema";
import { normalizeUrlForComparison } from "@/lib/url-utils";

interface LinksState {
  // Links data
  links: Link[];
  setLinks: (links: Link[]) => void;
  addLink: (link: Link) => void;
  updateLink: (id: string, updates: Partial<Link>) => void;
  removeLink: (id: string) => void;
  reorderLinks: (orderedIds: string[], categoryId: string | null) => Promise<void>;

  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  reorderCategories: (orderedIds: string[]) => Promise<void>;

  // Tags
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  removeTag: (id: string) => void;
  reorderTags: (orderedIds: string[]) => Promise<void>;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Modal states
  isAddLinkModalOpen: boolean;
  setAddLinkModalOpen: (open: boolean) => void;
  prefillLinkData: { url?: string; title?: string; description?: string } | null;
  openAddLinkModal: (prefill?: { url?: string; title?: string; description?: string }) => void;
  closeAddLinkModal: () => void;
  isAddCategoryModalOpen: boolean;
  setAddCategoryModalOpen: (open: boolean) => void;
  isEditLinkModalOpen: boolean;
  setEditLinkModalOpen: (open: boolean) => void;
  isAddTagModalOpen: boolean;
  setAddTagModalOpen: (open: boolean) => void;
  isManageCategoriesModalOpen: boolean;
  setManageCategoriesModalOpen: (open: boolean) => void;
  isManageTagsModalOpen: boolean;
  setManageTagsModalOpen: (open: boolean) => void;

  // Selected link for editing
  selectedLink: Link | null;
  setSelectedLink: (link: Link | null) => void;
  openEditLinkModal: (link: Link) => void;
  closeEditLinkModal: () => void;

  // Selected category/tag for editing
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  selectedTag: Tag | null;
  setSelectedTag: (tag: Tag | null) => void;

  // Link-Tag associations (for quick lookup)
  linkTags: Array<{ linkId: string; tagId: string }>;
  setLinkTags: (linkTags: Array<{ linkId: string; tagId: string }>) => void;
  addLinkTag: (linkId: string, tagId: string) => void;
  removeLinkTag: (linkId: string, tagId: string) => void;

  // Helper to get tags for a specific link
  getTagsForLink: (linkId: string) => Tag[];

  // Helper to get links for a specific tag
  getLinksForTag: (tagId: string) => Link[];

  // Bulk actions
  openAllLinks: (links: Link[]) => void;
  openCategoryLinks: (categoryId: string) => void;
  openFavoriteLinks: () => void;
  bulkToggleFavorite: (linkIds: string[], isFavorite: boolean) => void;
  bulkDelete: (linkIds: string[]) => void;
  bulkMoveToCategory: (linkIds: string[], categoryId: string | null) => void;

  // Duplicate detection
  findDuplicates: () => Array<{ url: string; links: Link[] }>;
  isDuplicateUrl: (url: string) => boolean;
  getDuplicatesForUrl: (url: string) => Link[];

  // Export/Import
  exportToJSON: () => string;
  exportToHTML: () => string;
}

export const useLinksStore = create<LinksState>((set, get) => ({
  // Links
  links: [],
  setLinks: (links) => set({ links }),
  addLink: (link) => set((state) => ({ links: [link, ...state.links] })),
  updateLink: (id, updates) =>
    set((state) => ({
      links: state.links.map((link) =>
        link.id === id ? { ...link, ...updates } : link
      ),
    })),
  removeLink: (id) =>
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
    })),

  reorderLinks: async (orderedIds, categoryId) => {
    // Optimistic update - only update order for links in this category
    const originalLinks = get().links;
    const reorderedLinks = originalLinks.map((link) => {
      const orderIndex = orderedIds.indexOf(link.id);
      if (orderIndex !== -1) {
        return { ...link, order: orderIndex };
      }
      return link;
    });

    set({ links: reorderedLinks });

    try {
      const response = await fetch("/api/links/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds, categoryId }),
      });

      if (!response.ok) {
        // Revert on error
        set({ links: originalLinks });
        console.error("Failed to reorder links:", response.statusText);
      } else {
        const updatedLinks: Link[] = await response.json();
        // Merge updated links with the rest
        const mergedLinks = originalLinks.map((link) => {
          const updated = updatedLinks.find((u) => u.id === link.id);
          return updated || link;
        });
        set({ links: mergedLinks });
      }
    } catch (error) {
      set({ links: originalLinks });
      console.error("Error reordering links:", error);
    }
  },

  // Categories
  categories: [],
  setCategories: (categories) => set({ categories }),
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      ),
    })),
  removeCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    })),

  reorderCategories: async (orderedIds) => {
    // Optimistic update
    const originalCategories = get().categories;
    const reorderedCategories = orderedIds.map((id, index) => {
      const category = get().categories.find(c => c.id === id);
      return category ? { ...category, order: index } : null;
    }).filter((c): c is Category => c !== null);

    set({ categories: reorderedCategories });

    try {
      const response = await fetch("/api/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) {
        // Revert on error
        set({ categories: originalCategories });
        console.error("Failed to reorder categories:", response.statusText);
      } else {
        const updatedCategories: Category[] = await response.json();
        set({ categories: updatedCategories });
      }
    } catch (error) {
      set({ categories: originalCategories });
      console.error("Error reordering categories:", error);
    }
  },

  // Tags
  tags: [],
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  updateTag: (id, updates) =>
    set((state) => ({
      tags: state.tags.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      ),
    })),
  removeTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
    })),

  reorderTags: async (orderedIds) => {
    // Optimistic update
    const originalTags = get().tags;
    const reorderedTags = orderedIds.map((id, index) => {
      const tag = get().tags.find(t => t.id === id);
      return tag ? { ...tag, order: index } : null;
    }).filter((t): t is Tag => t !== null);

    set({ tags: reorderedTags });

    try {
      const response = await fetch("/api/tags/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) {
        // Revert on error
        set({ tags: originalTags });
        console.error("Failed to reorder tags:", response.statusText);
      } else {
        const updatedTags: Tag[] = await response.json();
        set({ tags: updatedTags });
      }
    } catch (error) {
      set({ tags: originalTags });
      console.error("Error reordering tags:", error);
    }
  },

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Modals
  isAddLinkModalOpen: false,
  setAddLinkModalOpen: (open) => set({ isAddLinkModalOpen: open }),
  prefillLinkData: null,
  openAddLinkModal: (prefill) => set({
    isAddLinkModalOpen: true,
    prefillLinkData: prefill || null
  }),
  closeAddLinkModal: () => set({
    isAddLinkModalOpen: false,
    prefillLinkData: null
  }),
  isAddCategoryModalOpen: false,
  setAddCategoryModalOpen: (open) => set({ isAddCategoryModalOpen: open }),
  isEditLinkModalOpen: false,
  setEditLinkModalOpen: (open) => set({ isEditLinkModalOpen: open }),
  isAddTagModalOpen: false,
  setAddTagModalOpen: (open) => set({ isAddTagModalOpen: open }),
  isManageCategoriesModalOpen: false,
  setManageCategoriesModalOpen: (open) => set({ isManageCategoriesModalOpen: open }),
  isManageTagsModalOpen: false,
  setManageTagsModalOpen: (open) => set({ isManageTagsModalOpen: open }),

  // Selected link
  selectedLink: null,
  setSelectedLink: (link) => set({ selectedLink: link }),
  openEditLinkModal: (link) => set({ selectedLink: link, isEditLinkModalOpen: true }),
  closeEditLinkModal: () => set({ selectedLink: null, isEditLinkModalOpen: false }),

  // Selected category/tag
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  selectedTag: null,
  setSelectedTag: (tag) => set({ selectedTag: tag }),

  // Link-Tag associations
  linkTags: [],
  setLinkTags: (linkTags) => set({ linkTags }),
  addLinkTag: (linkId, tagId) =>
    set((state) => ({
      linkTags: [...state.linkTags, { linkId, tagId }],
    })),
  removeLinkTag: (linkId, tagId) =>
    set((state) => ({
      linkTags: state.linkTags.filter(
        (lt) => !(lt.linkId === linkId && lt.tagId === tagId)
      ),
    })),

  // Helper to get tags for a specific link
  getTagsForLink: (linkId) => {
    const state = get();
    const tagIds = state.linkTags
      .filter((lt) => lt.linkId === linkId)
      .map((lt) => lt.tagId);
    return state.tags.filter((tag) => tagIds.includes(tag.id));
  },

  // Helper to get links for a specific tag
  getLinksForTag: (tagId) => {
    const state = get();
    const linkIds = state.linkTags
      .filter((lt) => lt.tagId === tagId)
      .map((lt) => lt.linkId);
    return state.links.filter((link) => linkIds.includes(link.id));
  },

  // Bulk actions
  openAllLinks: (links) => {
    // Open links in new tabs (with slight delay to avoid popup blockers)
    links.forEach((link, index) => {
      setTimeout(() => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      }, index * 100); // 100ms delay between each
    });
  },

  openCategoryLinks: (categoryId) => {
    const state = get();
    const categoryLinks = state.links.filter((link) => link.categoryId === categoryId);
    state.openAllLinks(categoryLinks);
  },

  openFavoriteLinks: () => {
    const state = get();
    const favoriteLinks = state.links.filter((link) => link.isFavorite);
    state.openAllLinks(favoriteLinks);
  },

  bulkToggleFavorite: (linkIds, isFavorite) => {
    set((state) => ({
      links: state.links.map((link) =>
        linkIds.includes(link.id) ? { ...link, isFavorite } : link
      ),
    }));
  },

  bulkDelete: (linkIds) => {
    set((state) => ({
      links: state.links.filter((link) => !linkIds.includes(link.id)),
      linkTags: state.linkTags.filter((lt) => !linkIds.includes(lt.linkId)),
    }));
  },

  bulkMoveToCategory: (linkIds, categoryId) => {
    set((state) => ({
      links: state.links.map((link) =>
        linkIds.includes(link.id) ? { ...link, categoryId } : link
      ),
    }));
  },

  // Duplicate detection
  findDuplicates: () => {
    const state = get();
    const urlMap = new Map<string, Link[]>();

    // Group links by normalized URL
    state.links.forEach((link) => {
      const normalizedUrl = normalizeUrlForComparison(link.url);
      const existing = urlMap.get(normalizedUrl) || [];
      existing.push(link);
      urlMap.set(normalizedUrl, existing);
    });

    // Return only duplicates (more than 1 link per URL)
    const duplicates: Array<{ url: string; links: Link[] }> = [];
    urlMap.forEach((links, url) => {
      if (links.length > 1) {
        duplicates.push({ url, links });
      }
    });

    return duplicates;
  },

  isDuplicateUrl: (url) => {
    const state = get();
    const normalizedInput = normalizeUrlForComparison(url);
    return state.links.some((link) => normalizeUrlForComparison(link.url) === normalizedInput);
  },

  getDuplicatesForUrl: (url) => {
    const state = get();
    const normalizedInput = normalizeUrlForComparison(url);
    return state.links.filter((link) => normalizeUrlForComparison(link.url) === normalizedInput);
  },

  // Export/Import
  exportToJSON: () => {
    const state = get();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      links: state.links,
      categories: state.categories,
      tags: state.tags,
      linkTags: state.linkTags,
    };
    return JSON.stringify(exportData, null, 2);
  },

  exportToHTML: () => {
    const state = get();

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
    const uncategorized = state.links.filter((link) => !link.categoryId);
    const categorized = new Map<string, Link[]>();

    state.links.forEach((link) => {
      if (link.categoryId) {
        const existing = categorized.get(link.categoryId) || [];
        existing.push(link);
        categorized.set(link.categoryId, existing);
      }
    });

    // Export categorized links
    state.categories.forEach((category) => {
      const categoryLinks = categorized.get(category.id) || [];
      if (categoryLinks.length > 0) {
        html += `    <DT><H3>${escapeHtml(category.name)}</H3>\n`;
        html += `    <DL><p>\n`;
        categoryLinks.forEach((link) => {
          const addDate = Math.floor(new Date(link.createdAt).getTime() / 1000);
          html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${link.faviconUrl ? ` ICON="${escapeHtml(link.faviconUrl)}"` : ''}>${escapeHtml(link.title)}</A>\n`;
          if (link.description) {
            html += `        <DD>${escapeHtml(link.description)}\n`;
          }
        });
        html += `    </DL><p>\n`;
      }
    });

    // Export uncategorized links
    if (uncategorized.length > 0) {
      html += `    <DT><H3>Sin categoría</H3>\n`;
      html += `    <DL><p>\n`;
      uncategorized.forEach((link) => {
        const addDate = Math.floor(new Date(link.createdAt).getTime() / 1000);
        html += `        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${addDate}"${link.faviconUrl ? ` ICON="${escapeHtml(link.faviconUrl)}"` : ''}>${escapeHtml(link.title)}</A>\n`;
        if (link.description) {
          html += `        <DD>${escapeHtml(link.description)}\n`;
        }
      });
      html += `    </DL><p>\n`;
    }

    html += `</DL><p>`;

    return html;
  },
}));

// Helper function for HTML escaping
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
