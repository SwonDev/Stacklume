/**
 * Analytics Tests
 *
 * Tests for the Plausible analytics utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { trackEvent, trackPageView, analytics } from '../analytics';

describe('Analytics', () => {
  beforeEach(() => {
    // Mock console.log for development logging
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset window.plausible
    if (typeof window !== 'undefined') {
      (window as Window & { plausible?: unknown }).plausible = undefined;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackEvent', () => {
    it('should not throw when plausible is not available', () => {
      // When plausible is not available, trackEvent should not throw
      expect(() => trackEvent('link_added')).not.toThrow();
    });

    it('should not throw with props when plausible is not available', () => {
      expect(() => trackEvent('widget_added', { type: 'notes' })).not.toThrow();
    });

    it('should call plausible when available', () => {
      const mockPlausible = vi.fn();
      (window as Window & { plausible?: unknown }).plausible = mockPlausible;

      trackEvent('link_added');
      expect(mockPlausible).toHaveBeenCalledWith('link_added');
    });

    it('should call plausible with props when available', () => {
      const mockPlausible = vi.fn();
      (window as Window & { plausible?: unknown }).plausible = mockPlausible;

      trackEvent('widget_added', { type: 'todo' });
      expect(mockPlausible).toHaveBeenCalledWith('widget_added', { props: { type: 'todo' } });
    });

    it('should handle plausible errors gracefully', () => {
      const mockPlausible = vi.fn().mockImplementation(() => {
        throw new Error('Plausible error');
      });
      (window as Window & { plausible?: unknown }).plausible = mockPlausible;

      // Should not throw
      expect(() => trackEvent('link_added')).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('trackPageView', () => {
    it('should not throw when plausible is not available', () => {
      expect(() => trackPageView()).not.toThrow();
    });

    it('should not throw with URL when plausible is not available', () => {
      expect(() => trackPageView('/dashboard')).not.toThrow();
    });

    it('should call plausible for pageview when available', () => {
      const mockPlausible = vi.fn();
      (window as Window & { plausible?: unknown }).plausible = mockPlausible;

      trackPageView();
      expect(mockPlausible).toHaveBeenCalledWith('pageview');
    });

    it('should call plausible with URL when available', () => {
      const mockPlausible = vi.fn();
      (window as Window & { plausible?: unknown }).plausible = mockPlausible;

      trackPageView('/settings');
      expect(mockPlausible).toHaveBeenCalledWith('pageview', { props: { url: '/settings' } });
    });
  });

  describe('analytics convenience object', () => {
    it('should have linkAdded method', () => {
      expect(typeof analytics.linkAdded).toBe('function');
      expect(() => analytics.linkAdded()).not.toThrow();
    });

    it('should have linkAdded with source', () => {
      expect(() => analytics.linkAdded('manual')).not.toThrow();
    });

    it('should have linkDeleted method', () => {
      expect(typeof analytics.linkDeleted).toBe('function');
      analytics.linkDeleted();
    });

    it('should have linkEdited method', () => {
      expect(typeof analytics.linkEdited).toBe('function');
      analytics.linkEdited();
    });

    it('should have linkFavorited method', () => {
      expect(typeof analytics.linkFavorited).toBe('function');
      analytics.linkFavorited();
    });

    it('should have linksImported method', () => {
      expect(typeof analytics.linksImported).toBe('function');
      analytics.linksImported(10);
    });

    it('should have widgetAdded method', () => {
      expect(typeof analytics.widgetAdded).toBe('function');
      analytics.widgetAdded('notes');
    });

    it('should have widgetDeleted method', () => {
      expect(typeof analytics.widgetDeleted).toBe('function');
      analytics.widgetDeleted('todo');
    });

    it('should have widgetConfigured method', () => {
      expect(typeof analytics.widgetConfigured).toBe('function');
      analytics.widgetConfigured('calendar');
    });

    it('should have widgetLocked method', () => {
      expect(typeof analytics.widgetLocked).toBe('function');
      analytics.widgetLocked();
    });

    it('should have widgetUnlocked method', () => {
      expect(typeof analytics.widgetUnlocked).toBe('function');
      analytics.widgetUnlocked();
    });

    it('should have categoryCreated method', () => {
      expect(typeof analytics.categoryCreated).toBe('function');
      analytics.categoryCreated();
    });

    it('should have tagCreated method', () => {
      expect(typeof analytics.tagCreated).toBe('function');
      analytics.tagCreated();
    });

    it('should have projectCreated method', () => {
      expect(typeof analytics.projectCreated).toBe('function');
      analytics.projectCreated();
    });

    it('should have projectSwitched method', () => {
      expect(typeof analytics.projectSwitched).toBe('function');
      analytics.projectSwitched();
    });

    it('should have backupCreated method', () => {
      expect(typeof analytics.backupCreated).toBe('function');
      analytics.backupCreated('manual');
    });

    it('should have backupRestored method', () => {
      expect(typeof analytics.backupRestored).toBe('function');
      analytics.backupRestored();
    });

    it('should have backupExported method', () => {
      expect(typeof analytics.backupExported).toBe('function');
      analytics.backupExported();
    });

    it('should have userSignedIn method', () => {
      expect(typeof analytics.userSignedIn).toBe('function');
      analytics.userSignedIn('google');
    });

    it('should have userSignedOut method', () => {
      expect(typeof analytics.userSignedOut).toBe('function');
      analytics.userSignedOut();
    });

    it('should have userRegistered method', () => {
      expect(typeof analytics.userRegistered).toBe('function');
      analytics.userRegistered('github');
    });

    it('should have viewModeChanged method', () => {
      expect(typeof analytics.viewModeChanged).toBe('function');
      analytics.viewModeChanged('kanban');
    });

    it('should have editModeToggled method', () => {
      expect(typeof analytics.editModeToggled).toBe('function');
      analytics.editModeToggled(true);
    });

    it('should have searchPerformed method', () => {
      expect(typeof analytics.searchPerformed).toBe('function');
      analytics.searchPerformed();
    });

    it('should have duplicateDetection method', () => {
      expect(typeof analytics.duplicateDetection).toBe('function');
      analytics.duplicateDetection(3);
    });

    it('should have pwaInstalled method', () => {
      expect(typeof analytics.pwaInstalled).toBe('function');
      analytics.pwaInstalled();
    });

    it('should have offlineModeEntered method', () => {
      expect(typeof analytics.offlineModeEntered).toBe('function');
      analytics.offlineModeEntered();
    });
  });
});
