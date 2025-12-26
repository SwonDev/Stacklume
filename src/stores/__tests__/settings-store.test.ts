/**
 * Settings Store Tests
 *
 * Tests for the user settings store
 * Covers theme, view mode, view density, and API persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from '../settings-store';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods to reduce noise
vi.spyOn(console, 'error').mockImplementation(() => {});

// Helper to create mock fetch responses
function createMockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe('Settings Store', () => {
  // Reset store and mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    act(() => {
      useSettingsStore.setState({
        theme: 'system',
        viewDensity: 'normal',
        viewMode: 'bento',
        showTooltips: true,
        reduceMotion: false,
        stickerSoundVolume: 50,
        isLoading: false,
        isInitialized: false,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct default values', () => {
      const state = useSettingsStore.getState();

      expect(state.theme).toBe('system');
      expect(state.viewDensity).toBe('normal');
      expect(state.viewMode).toBe('bento');
      expect(state.showTooltips).toBe(true);
      expect(state.reduceMotion).toBe(false);
      expect(state.stickerSoundVolume).toBe(50);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('initSettings', () => {
    it('should fetch and set settings from API', async () => {
      const mockSettings = {
        theme: 'dark',
        viewDensity: 'compact',
        viewMode: 'kanban',
        showTooltips: false,
        reduceMotion: true,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockSettings));

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.viewDensity).toBe('compact');
      expect(state.viewMode).toBe('kanban');
      expect(state.showTooltips).toBe(false);
      expect(state.reduceMotion).toBe(true);
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should not reinitialize if already initialized', async () => {
      act(() => {
        useSettingsStore.setState({ isInitialized: true });
      });

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      const state = useSettingsStore.getState();
      // Should keep default values on error
      expect(state.theme).toBe('system');
      expect(state.isLoading).toBe(false);
    });

    it('should handle non-ok response gracefully', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500));

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      const state = useSettingsStore.getState();
      // Should keep default values
      expect(state.theme).toBe('system');
      expect(state.isInitialized).toBe(false);
    });

    it('should set isLoading during fetch', async () => {
      let loadingDuringFetch = false;

      mockFetch.mockImplementationOnce(() => {
        loadingDuringFetch = useSettingsStore.getState().isLoading;
        return createMockResponse({ theme: 'dark' });
      });

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      expect(loadingDuringFetch).toBe(true);
      expect(useSettingsStore.getState().isLoading).toBe(false);
    });

    it('should use default viewMode if not provided by API', async () => {
      const mockSettings = {
        theme: 'light',
        viewDensity: 'normal',
        showTooltips: true,
        reduceMotion: false,
        // viewMode not included
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockSettings));

      await act(async () => {
        await useSettingsStore.getState().initSettings();
      });

      expect(useSettingsStore.getState().viewMode).toBe('bento');
    });
  });

  describe('setTheme', () => {
    it('should update theme and persist to API', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await act(async () => {
        await useSettingsStore.getState().setTheme('dark');
      });

      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });
    });

    it('should accept all valid theme values', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      const themes = ['light', 'dark', 'system'] as const;

      for (const theme of themes) {
        await act(async () => {
          await useSettingsStore.getState().setTheme(theme);
        });
        expect(useSettingsStore.getState().theme).toBe(theme);
      }
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSettingsStore.getState().setTheme('dark');
      });

      // State should still be updated locally
      expect(useSettingsStore.getState().theme).toBe('dark');
    });
  });

  describe('setViewDensity', () => {
    it('should update view density and persist to API', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await act(async () => {
        await useSettingsStore.getState().setViewDensity('compact');
      });

      expect(useSettingsStore.getState().viewDensity).toBe('compact');
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewDensity: 'compact' }),
      });
    });

    it('should accept all valid view density values', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      const densities = ['compact', 'normal', 'comfortable'] as const;

      for (const density of densities) {
        await act(async () => {
          await useSettingsStore.getState().setViewDensity(density);
        });
        expect(useSettingsStore.getState().viewDensity).toBe(density);
      }
    });
  });

  describe('setViewMode', () => {
    it('should update view mode and persist to API', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await act(async () => {
        await useSettingsStore.getState().setViewMode('kanban');
      });

      expect(useSettingsStore.getState().viewMode).toBe('kanban');
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewMode: 'kanban' }),
      });
    });

    it('should accept all valid view mode values', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      const modes = ['bento', 'kanban', 'list'] as const;

      for (const mode of modes) {
        await act(async () => {
          await useSettingsStore.getState().setViewMode(mode);
        });
        expect(useSettingsStore.getState().viewMode).toBe(mode);
      }
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSettingsStore.getState().setViewMode('kanban');
      });

      // State should still be updated locally
      expect(useSettingsStore.getState().viewMode).toBe('kanban');
    });
  });

  describe('setShowTooltips', () => {
    it('should update show tooltips and persist to API', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await act(async () => {
        await useSettingsStore.getState().setShowTooltips(false);
      });

      expect(useSettingsStore.getState().showTooltips).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showTooltips: false }),
      });
    });

    it('should toggle show tooltips correctly', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      // Initially true
      expect(useSettingsStore.getState().showTooltips).toBe(true);

      await act(async () => {
        await useSettingsStore.getState().setShowTooltips(false);
      });
      expect(useSettingsStore.getState().showTooltips).toBe(false);

      await act(async () => {
        await useSettingsStore.getState().setShowTooltips(true);
      });
      expect(useSettingsStore.getState().showTooltips).toBe(true);
    });
  });

  describe('setReduceMotion', () => {
    it('should update reduce motion and persist to API', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await act(async () => {
        await useSettingsStore.getState().setReduceMotion(true);
      });

      expect(useSettingsStore.getState().reduceMotion).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reduceMotion: true }),
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useSettingsStore.getState().setReduceMotion(true);
      });

      // State should still be updated locally
      expect(useSettingsStore.getState().reduceMotion).toBe(true);
    });
  });

  describe('setStickerSoundVolume', () => {
    it('should update sticker sound volume', () => {
      act(() => {
        useSettingsStore.getState().setStickerSoundVolume(75);
      });

      expect(useSettingsStore.getState().stickerSoundVolume).toBe(75);
    });

    it('should persist to localStorage', () => {
      act(() => {
        useSettingsStore.getState().setStickerSoundVolume(30);
      });

      expect(window.localStorage.getItem('stacklume-sticker-sound-volume')).toBe('30');
    });

    it('should accept boundary values', () => {
      act(() => {
        useSettingsStore.getState().setStickerSoundVolume(0);
      });
      expect(useSettingsStore.getState().stickerSoundVolume).toBe(0);

      act(() => {
        useSettingsStore.getState().setStickerSoundVolume(100);
      });
      expect(useSettingsStore.getState().stickerSoundVolume).toBe(100);
    });

    it('should not make API call (localStorage only)', () => {
      act(() => {
        useSettingsStore.getState().setStickerSoundVolume(50);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('State Persistence', () => {
    it('should update state immediately before API call completes', async () => {
      let stateBeforeApiResolves = '';

      mockFetch.mockImplementationOnce(() => {
        stateBeforeApiResolves = useSettingsStore.getState().theme;
        return new Promise((resolve) =>
          setTimeout(() => resolve(createMockResponse({ success: true })), 100)
        );
      });

      // Start the async operation but don't await
      const promise = act(async () => {
        useSettingsStore.getState().setTheme('dark');
      });

      // State should be updated immediately
      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(stateBeforeApiResolves).toBe('dark');

      await promise;
    });
  });

  describe('Multiple Settings Updates', () => {
    it('should handle multiple rapid updates', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true }));

      await act(async () => {
        // Fire multiple updates rapidly
        useSettingsStore.getState().setTheme('dark');
        useSettingsStore.getState().setViewMode('kanban');
        useSettingsStore.getState().setViewDensity('compact');
      });

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.viewMode).toBe('kanban');
      expect(state.viewDensity).toBe('compact');

      // Each should have made an API call
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
