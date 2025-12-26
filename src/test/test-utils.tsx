import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { expect } from 'vitest';

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark' | 'system';
}

function AllTheProviders({ children, theme = 'light' }: { children: ReactNode; theme?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem
      disableTransitionOnChange
      storageKey="stacklume-theme"
    >
      {children}
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { theme, ...options }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders theme={theme}>{children}</AllTheProviders>,
    ...options,
  });
}

/**
 * Mock fetch response helper
 */
export function createMockResponse<T>(data: T, status = 200, ok = true) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
  } as Response;
}

/**
 * Wait for async state updates in tests
 */
export const waitForNextUpdate = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * Create a delay for testing loading states
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock localStorage for testing
 */
export function setupLocalStorageMock() {
  const store: Record<string, string> = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };

  return localStorageMock;
}

/**
 * Create a mock file for file upload tests
 */
export function createMockFile(name: string, size: number, type: string): File {
  const blob = new Blob(['a'.repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Create mock intersection observer entries for testing
 */
export function createIntersectionObserverEntry(
  target: Element,
  isIntersecting: boolean
): IntersectionObserverEntry {
  return {
    target,
    isIntersecting,
    boundingClientRect: target.getBoundingClientRect(),
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: target.getBoundingClientRect(),
    rootBounds: null,
    time: Date.now(),
  } as IntersectionObserverEntry;
}

/**
 * Helper to test async error boundaries
 */
export async function expectToThrowAsync(fn: () => Promise<unknown>, errorMessage?: string) {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (errorMessage && error instanceof Error) {
      expect(error.message).toContain(errorMessage);
    }
  }
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
