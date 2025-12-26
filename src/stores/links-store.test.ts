import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLinksStore } from './links-store';
import type { Link, Category, Tag } from '@/lib/db/schema';

// Helper to create mock link
const createMockLink = (overrides?: Partial<Link>): Link => ({
  id: 'link-1',
  userId: null,
  url: 'https://example.com',
  title: 'Example Link',
  description: 'A test link',
  imageUrl: null,
  faviconUrl: null,
  categoryId: null,
  isFavorite: false,
  siteName: null,
  author: null,
  publishedAt: null,
  source: null,
  sourceId: null,
  platform: null,
  contentType: null,
  platformColor: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  healthStatus: null,
  lastCheckedAt: null,
  ...overrides,
});

// Helper to create mock category
const createMockCategory = (overrides?: Partial<Category>): Category => ({
  id: 'cat-1',
  userId: null,
  name: 'Test Category',
  description: null,
  icon: null,
  color: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

// Helper to create mock tag
const createMockTag = (overrides?: Partial<Tag>): Tag => ({
  id: 'tag-1',
  userId: null,
  name: 'Test Tag',
  color: null,
  order: 0,
  createdAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe('useLinksStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useLinksStore.getState();
    store.setLinks([]);
    store.setCategories([]);
    store.setTags([]);
    store.setLinkTags([]);
    store.setIsLoading(false);
    store.setAddLinkModalOpen(false);
    store.setSelectedLink(null);
  });

  describe('Links Management', () => {
    it('should initialize with empty links array', () => {
      const { links } = useLinksStore.getState();
      expect(links).toEqual([]);
    });

    it('should set links', () => {
      const mockLinks = [
        createMockLink({ id: 'link-1', title: 'Link 1' }),
        createMockLink({ id: 'link-2', title: 'Link 2' }),
      ];

      useLinksStore.getState().setLinks(mockLinks);

      const { links } = useLinksStore.getState();
      expect(links).toHaveLength(2);
      expect(links[0].title).toBe('Link 1');
      expect(links[1].title).toBe('Link 2');
    });

    it('should add a new link at the beginning of the array', () => {
      const existingLink = createMockLink({ id: 'link-1', title: 'Existing' });
      const newLink = createMockLink({ id: 'link-2', title: 'New Link' });

      useLinksStore.getState().setLinks([existingLink]);
      useLinksStore.getState().addLink(newLink);

      const { links } = useLinksStore.getState();
      expect(links).toHaveLength(2);
      expect(links[0].id).toBe('link-2'); // New link should be first
      expect(links[1].id).toBe('link-1');
    });

    it('should update an existing link', () => {
      const link = createMockLink({ id: 'link-1', title: 'Original' });
      useLinksStore.getState().setLinks([link]);

      useLinksStore.getState().updateLink('link-1', {
        title: 'Updated Title',
        isFavorite: true,
      });

      const { links } = useLinksStore.getState();
      expect(links[0].title).toBe('Updated Title');
      expect(links[0].isFavorite).toBe(true);
    });

    it('should remove a link by id', () => {
      const links = [
        createMockLink({ id: 'link-1' }),
        createMockLink({ id: 'link-2' }),
        createMockLink({ id: 'link-3' }),
      ];
      useLinksStore.getState().setLinks(links);

      useLinksStore.getState().removeLink('link-2');

      const { links: updatedLinks } = useLinksStore.getState();
      expect(updatedLinks).toHaveLength(2);
      expect(updatedLinks.find((l) => l.id === 'link-2')).toBeUndefined();
    });

    it('should toggle favorite status correctly', () => {
      const link = createMockLink({ id: 'link-1', isFavorite: false });
      useLinksStore.getState().setLinks([link]);

      useLinksStore.getState().updateLink('link-1', { isFavorite: true });

      expect(useLinksStore.getState().links[0].isFavorite).toBe(true);
    });
  });

  describe('Categories Management', () => {
    it('should add a category', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });

      useLinksStore.getState().addCategory(category);

      const { categories } = useLinksStore.getState();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Work');
    });

    it('should update a category', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });
      useLinksStore.getState().setCategories([category]);

      useLinksStore.getState().updateCategory('cat-1', { name: 'Personal' });

      const { categories } = useLinksStore.getState();
      expect(categories[0].name).toBe('Personal');
    });

    it('should remove a category', () => {
      const categories = [
        createMockCategory({ id: 'cat-1', name: 'Work' }),
        createMockCategory({ id: 'cat-2', name: 'Personal' }),
      ];
      useLinksStore.getState().setCategories(categories);

      useLinksStore.getState().removeCategory('cat-1');

      const { categories: updatedCategories } = useLinksStore.getState();
      expect(updatedCategories).toHaveLength(1);
      expect(updatedCategories[0].name).toBe('Personal');
    });
  });

  describe('Tags Management', () => {
    it('should add a tag', () => {
      const tag = createMockTag({ id: 'tag-1', name: 'Important' });

      useLinksStore.getState().addTag(tag);

      const { tags } = useLinksStore.getState();
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('Important');
    });

    it('should update a tag', () => {
      const tag = createMockTag({ id: 'tag-1', name: 'Important' });
      useLinksStore.getState().setTags([tag]);

      useLinksStore.getState().updateTag('tag-1', { name: 'Urgent' });

      const { tags } = useLinksStore.getState();
      expect(tags[0].name).toBe('Urgent');
    });

    it('should remove a tag', () => {
      const tags = [
        createMockTag({ id: 'tag-1', name: 'Important' }),
        createMockTag({ id: 'tag-2', name: 'Urgent' }),
      ];
      useLinksStore.getState().setTags(tags);

      useLinksStore.getState().removeTag('tag-1');

      const { tags: updatedTags } = useLinksStore.getState();
      expect(updatedTags).toHaveLength(1);
      expect(updatedTags[0].name).toBe('Urgent');
    });
  });

  describe('Link-Tag Associations', () => {
    it('should add a link-tag association', () => {
      useLinksStore.getState().addLinkTag('link-1', 'tag-1');

      const { linkTags } = useLinksStore.getState();
      expect(linkTags).toHaveLength(1);
      expect(linkTags[0]).toEqual({ linkId: 'link-1', tagId: 'tag-1' });
    });

    it('should remove a link-tag association', () => {
      useLinksStore.getState().setLinkTags([
        { linkId: 'link-1', tagId: 'tag-1' },
        { linkId: 'link-1', tagId: 'tag-2' },
      ]);

      useLinksStore.getState().removeLinkTag('link-1', 'tag-1');

      const { linkTags } = useLinksStore.getState();
      expect(linkTags).toHaveLength(1);
      expect(linkTags[0].tagId).toBe('tag-2');
    });

    it('should get tags for a specific link', () => {
      const tags = [
        createMockTag({ id: 'tag-1', name: 'Important' }),
        createMockTag({ id: 'tag-2', name: 'Urgent' }),
        createMockTag({ id: 'tag-3', name: 'Later' }),
      ];
      useLinksStore.getState().setTags(tags);
      useLinksStore.getState().setLinkTags([
        { linkId: 'link-1', tagId: 'tag-1' },
        { linkId: 'link-1', tagId: 'tag-2' },
        { linkId: 'link-2', tagId: 'tag-3' },
      ]);

      const linkTags = useLinksStore.getState().getTagsForLink('link-1');

      expect(linkTags).toHaveLength(2);
      expect(linkTags.map((t) => t.name)).toEqual(['Important', 'Urgent']);
    });

    it('should get links for a specific tag', () => {
      const links = [
        createMockLink({ id: 'link-1', title: 'Link 1' }),
        createMockLink({ id: 'link-2', title: 'Link 2' }),
        createMockLink({ id: 'link-3', title: 'Link 3' }),
      ];
      useLinksStore.getState().setLinks(links);
      useLinksStore.getState().setLinkTags([
        { linkId: 'link-1', tagId: 'tag-1' },
        { linkId: 'link-3', tagId: 'tag-1' },
        { linkId: 'link-2', tagId: 'tag-2' },
      ]);

      const tagLinks = useLinksStore.getState().getLinksForTag('tag-1');

      expect(tagLinks).toHaveLength(2);
      expect(tagLinks.map((l) => l.title)).toEqual(['Link 1', 'Link 3']);
    });
  });

  describe('Modal States', () => {
    it('should open and close add link modal', () => {
      expect(useLinksStore.getState().isAddLinkModalOpen).toBe(false);

      useLinksStore.getState().setAddLinkModalOpen(true);
      expect(useLinksStore.getState().isAddLinkModalOpen).toBe(true);

      useLinksStore.getState().setAddLinkModalOpen(false);
      expect(useLinksStore.getState().isAddLinkModalOpen).toBe(false);
    });

    it('should open add link modal with prefill data', () => {
      const prefillData = {
        url: 'https://example.com',
        title: 'Example',
        description: 'Test',
      };

      useLinksStore.getState().openAddLinkModal(prefillData);

      const state = useLinksStore.getState();
      expect(state.isAddLinkModalOpen).toBe(true);
      expect(state.prefillLinkData).toEqual(prefillData);
    });

    it('should clear prefill data when closing add link modal', () => {
      useLinksStore.getState().openAddLinkModal({
        url: 'https://example.com',
      });

      useLinksStore.getState().closeAddLinkModal();

      const state = useLinksStore.getState();
      expect(state.isAddLinkModalOpen).toBe(false);
      expect(state.prefillLinkData).toBeNull();
    });

    it('should handle edit link modal with selected link', () => {
      const link = createMockLink({ id: 'link-1', title: 'Test' });

      useLinksStore.getState().openEditLinkModal(link);

      const state = useLinksStore.getState();
      expect(state.isEditLinkModalOpen).toBe(true);
      expect(state.selectedLink).toEqual(link);
    });

    it('should clear selected link when closing edit modal', () => {
      const link = createMockLink({ id: 'link-1' });
      useLinksStore.getState().openEditLinkModal(link);

      useLinksStore.getState().closeEditLinkModal();

      const state = useLinksStore.getState();
      expect(state.isEditLinkModalOpen).toBe(false);
      expect(state.selectedLink).toBeNull();
    });
  });

  describe('Bulk Actions', () => {
    it('should bulk toggle favorite status', () => {
      const links = [
        createMockLink({ id: 'link-1', isFavorite: false }),
        createMockLink({ id: 'link-2', isFavorite: false }),
        createMockLink({ id: 'link-3', isFavorite: true }),
      ];
      useLinksStore.getState().setLinks(links);

      useLinksStore.getState().bulkToggleFavorite(['link-1', 'link-2'], true);

      const { links: updatedLinks } = useLinksStore.getState();
      expect(updatedLinks[0].isFavorite).toBe(true);
      expect(updatedLinks[1].isFavorite).toBe(true);
      expect(updatedLinks[2].isFavorite).toBe(true);
    });

    it('should bulk delete links', () => {
      const links = [
        createMockLink({ id: 'link-1' }),
        createMockLink({ id: 'link-2' }),
        createMockLink({ id: 'link-3' }),
      ];
      useLinksStore.getState().setLinks(links);

      useLinksStore.getState().bulkDelete(['link-1', 'link-3']);

      const { links: updatedLinks } = useLinksStore.getState();
      expect(updatedLinks).toHaveLength(1);
      expect(updatedLinks[0].id).toBe('link-2');
    });

    it('should bulk move links to category', () => {
      const links = [
        createMockLink({ id: 'link-1', categoryId: null }),
        createMockLink({ id: 'link-2', categoryId: null }),
        createMockLink({ id: 'link-3', categoryId: 'cat-other' }),
      ];
      useLinksStore.getState().setLinks(links);

      useLinksStore.getState().bulkMoveToCategory(['link-1', 'link-2'], 'cat-work');

      const { links: updatedLinks } = useLinksStore.getState();
      expect(updatedLinks[0].categoryId).toBe('cat-work');
      expect(updatedLinks[1].categoryId).toBe('cat-work');
      expect(updatedLinks[2].categoryId).toBe('cat-other'); // Should not be affected
    });

    it('should open all links via window.open', () => {
      const links = [
        createMockLink({ id: 'link-1', url: 'https://example1.com' }),
        createMockLink({ id: 'link-2', url: 'https://example2.com' }),
      ];

      vi.useFakeTimers();
      useLinksStore.getState().openAllLinks(links);
      vi.advanceTimersByTime(200);

      // Verify window.open was called for both links
      expect(global.open).toHaveBeenCalledTimes(2);
      expect(global.open).toHaveBeenCalledWith(
        'https://example1.com',
        '_blank',
        'noopener,noreferrer'
      );
      expect(global.open).toHaveBeenCalledWith(
        'https://example2.com',
        '_blank',
        'noopener,noreferrer'
      );

      vi.useRealTimers();
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate URLs', () => {
      const links = [
        createMockLink({ id: 'link-1', url: 'https://example.com' }),
        createMockLink({ id: 'link-2', url: 'https://example.com/' }), // Trailing slash
        createMockLink({ id: 'link-3', url: 'https://different.com' }),
      ];
      useLinksStore.getState().setLinks(links);

      const isDuplicate = useLinksStore.getState().isDuplicateUrl('https://example.com');
      expect(isDuplicate).toBe(true);

      const isNotDuplicate = useLinksStore.getState().isDuplicateUrl('https://new.com');
      expect(isNotDuplicate).toBe(false);
    });

    it('should find all duplicates', () => {
      const links = [
        createMockLink({ id: 'link-1', url: 'https://example.com' }),
        createMockLink({ id: 'link-2', url: 'https://example.com/' }),
        createMockLink({ id: 'link-3', url: 'https://test.com' }),
        createMockLink({ id: 'link-4', url: 'https://test.com' }),
      ];
      useLinksStore.getState().setLinks(links);

      const duplicates = useLinksStore.getState().findDuplicates();

      expect(duplicates).toHaveLength(2); // Two groups of duplicates
      expect(duplicates[0].links.length).toBeGreaterThan(1);
      expect(duplicates[1].links.length).toBeGreaterThan(1);
    });

    it('should get all duplicates for a specific URL', () => {
      const links = [
        createMockLink({ id: 'link-1', url: 'https://example.com' }),
        createMockLink({ id: 'link-2', url: 'https://example.com/' }),
        createMockLink({ id: 'link-3', url: 'https://different.com' }),
      ];
      useLinksStore.getState().setLinks(links);

      const duplicates = useLinksStore.getState().getDuplicatesForUrl('https://example.com');

      expect(duplicates).toHaveLength(2);
      expect(duplicates.map((l) => l.id)).toEqual(['link-1', 'link-2']);
    });
  });

  describe('Export Functions', () => {
    it('should export links to JSON', () => {
      const links = [createMockLink({ id: 'link-1', title: 'Test' })];
      const categories = [createMockCategory({ id: 'cat-1', name: 'Work' })];
      const tags = [createMockTag({ id: 'tag-1', name: 'Important' })];

      useLinksStore.getState().setLinks(links);
      useLinksStore.getState().setCategories(categories);
      useLinksStore.getState().setTags(tags);

      const jsonExport = useLinksStore.getState().exportToJSON();
      const parsed = JSON.parse(jsonExport);

      expect(parsed.version).toBe('1.0');
      expect(parsed.links).toHaveLength(1);
      expect(parsed.categories).toHaveLength(1);
      expect(parsed.tags).toHaveLength(1);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should export links to HTML bookmark format', () => {
      const category = createMockCategory({ id: 'cat-1', name: 'Work' });
      const links = [
        createMockLink({
          id: 'link-1',
          title: 'Test Link',
          url: 'https://example.com',
          categoryId: 'cat-1',
          description: 'A test link',
        }),
      ];

      useLinksStore.getState().setCategories([category]);
      useLinksStore.getState().setLinks(links);

      const htmlExport = useLinksStore.getState().exportToHTML();

      expect(htmlExport).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
      expect(htmlExport).toContain('<H1>Bookmarks - Stacklume Export</H1>');
      expect(htmlExport).toContain('<H3>Work</H3>');
      expect(htmlExport).toContain('Test Link');
      expect(htmlExport).toContain('https://example.com');
      expect(htmlExport).toContain('A test link');
    });

    it('should escape HTML special characters in export', () => {
      const link = createMockLink({
        id: 'link-1',
        title: 'Link with <script> & "quotes"',
        url: 'https://example.com?param=value&other=test',
      });

      useLinksStore.getState().setLinks([link]);

      const htmlExport = useLinksStore.getState().exportToHTML();

      expect(htmlExport).toContain('&lt;script&gt;');
      expect(htmlExport).toContain('&amp;');
      expect(htmlExport).toContain('&quot;');
      expect(htmlExport).not.toContain('<script>');
    });
  });

  describe('Loading State', () => {
    it('should manage loading state', () => {
      expect(useLinksStore.getState().isLoading).toBe(false);

      useLinksStore.getState().setIsLoading(true);
      expect(useLinksStore.getState().isLoading).toBe(true);

      useLinksStore.getState().setIsLoading(false);
      expect(useLinksStore.getState().isLoading).toBe(false);
    });
  });
});
