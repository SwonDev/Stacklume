# Testing Setup Guide for Stacklume

This document provides a complete guide for the testing infrastructure configured for the Stacklume Next.js 16 + React 19 application.

## Quick Start

### 1. Install Dependencies

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react happy-dom
```

### 2. Run Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with interactive UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## What Was Configured

### 1. Core Testing Infrastructure

#### `vitest.config.ts`
- Configured Vitest with React 19 support using `@vitejs/plugin-react`
- Set up happy-dom as the test environment (better React 19 compatibility than jsdom)
- Configured path aliases (`@/`) to match TypeScript paths
- Set up coverage reporting with V8 provider
- Configured coverage thresholds (60% for all metrics)
- Set up test file patterns and exclusions

#### `src/test/setup.ts`
- Global test setup file that runs before each test
- Mocks for Next.js specific features:
  - `next/navigation` (useRouter, usePathname, useSearchParams, etc.)
  - `next/image` (Image component)
  - `next/link` (Link component)
- Browser API mocks:
  - `window.matchMedia` (for theme/responsive testing)
  - `IntersectionObserver` (for lazy loading)
  - `ResizeObserver` (for responsive components)
  - `localStorage` and `sessionStorage` (for persistence testing)
  - `window.open` (for link opening functionality)
  - `fetch` (for API testing)
- Automatic cleanup after each test

#### `src/test/test-utils.tsx`
Custom testing utilities:
- `renderWithProviders()` - Renders components with ThemeProvider and other context
- `createMockResponse()` - Creates mock fetch responses
- `waitForNextUpdate()` - Waits for async state updates
- `setupLocalStorageMock()` - Sets up localStorage for testing
- `createMockFile()` - Creates mock files for upload testing
- `createIntersectionObserverEntry()` - Creates mock intersection observer entries
- Re-exports all React Testing Library utilities

#### `package.json` Scripts
Added four test scripts:
- `test` - Run tests once (for CI/CD)
- `test:watch` - Run tests in watch mode (for development)
- `test:ui` - Run tests with interactive browser UI
- `test:coverage` - Run tests with coverage report

### 2. Sample Test Files

#### `src/stores/links-store.test.ts`
Comprehensive Zustand store testing covering:
- Links management (add, update, remove, reorder)
- Categories management
- Tags management
- Link-tag associations
- Modal state management
- Bulk operations (favorite, delete, move)
- Duplicate detection
- Export functionality (JSON and HTML)
- Loading states

**Key Features:**
- 20+ test cases covering all store methods
- Mock data factory functions for Links, Categories, and Tags
- Tests for optimistic updates and async operations
- Tests for complex features like duplicate detection
- Tests for export formats (JSON and HTML bookmark format)

#### `src/components/ui/button.test.tsx`
Component testing best practices:
- Rendering and DOM structure
- All button variants (default, destructive, outline, secondary, ghost, link)
- All button sizes (default, sm, lg, icon, icon-sm, icon-lg)
- User interactions (clicks, keyboard navigation)
- Disabled state behavior
- Accessibility features (ARIA attributes, keyboard focus)
- AsChild prop for polymorphic components
- Form integration

**Key Features:**
- 30+ test cases covering all component features
- User event simulation with `@testing-library/user-event`
- Accessibility-focused testing
- Tests for all variant and size combinations
- Form submission testing

#### `src/lib/url-utils.test.ts`
Utility function testing:
- `ensureProtocol()` - Adding protocol to URLs
- `normalizeUrlForComparison()` - URL normalization for duplicate detection
- `extractHostname()` - Hostname extraction
- `isValidUrl()` - URL validation
- Integration tests combining multiple utilities

**Key Features:**
- 50+ test cases covering edge cases
- Tests for URL normalization and comparison
- Tests for invalid input handling
- Integration tests for complete workflows

### 3. Documentation

#### `src/test/README.md`
Comprehensive testing guide including:
- Running tests
- Writing component tests
- Writing store tests
- Using custom render functions
- Testing async behavior
- Best practices
- Mocking strategies
- Coverage configuration
- Debugging tips
- Common patterns
- Troubleshooting guide

## Test Coverage

The configuration includes the following files with tests:

1. **Store Tests**: `src/stores/links-store.test.ts`
   - 100+ assertions across 20+ test cases
   - Covers all CRUD operations
   - Tests complex features like bulk actions and exports

2. **Component Tests**: `src/components/ui/button.test.tsx`
   - 30+ test cases
   - Full variant and size coverage
   - Accessibility testing
   - User interaction simulation

3. **Utility Tests**: `src/lib/url-utils.test.ts`
   - 50+ test cases
   - Edge case coverage
   - Integration testing

## Testing Philosophy

The setup follows these principles:

1. **Test User Behavior** - Focus on what users see and do, not implementation details
2. **Accessible Queries** - Use `getByRole`, `getByLabelText` over test IDs
3. **Real User Events** - Use `userEvent` for realistic interactions
4. **Automatic Cleanup** - Tests are isolated and clean up after themselves
5. **Meaningful Coverage** - 60% coverage threshold for real protection
6. **Fast Execution** - happy-dom provides fast test execution
7. **React 19 Compatible** - All tools support React 19

## Project-Specific Configuration

### Zustand Store Testing
```typescript
// Reset store before each test
beforeEach(() => {
  const store = useLinksStore.getState();
  store.setLinks([]);
  // ... reset other state
});

// Test store actions
it('should add link', () => {
  useLinksStore.getState().addLink(mockLink);
  expect(useLinksStore.getState().links).toContain(mockLink);
});
```

### Next.js Navigation Testing
```typescript
// Navigation is already mocked in setup.ts
import { useRouter } from 'next/navigation'; // Works in tests!

it('should navigate on click', () => {
  render(<MyComponent />);
  // Test component that uses useRouter
});
```

### Theme Provider Testing
```typescript
import { renderWithProviders } from '@/test/test-utils';

it('should render with theme', () => {
  renderWithProviders(<MyComponent />, { theme: 'dark' });
  // Component receives ThemeProvider context
});
```

## Next Steps

### Expand Test Coverage

1. **Widget Tests**
   - Test widget configurations
   - Test widget persistence
   - Test widget sizing and layout

2. **Form Tests**
   - Test form validation with Zod
   - Test React Hook Form integration
   - Test form submission

3. **Modal Tests**
   - Test modal open/close
   - Test modal forms
   - Test modal animations (with reduced motion)

4. **API Route Tests**
   - Mock database calls with Drizzle
   - Test error handling
   - Test validation

5. **Integration Tests**
   - Test complete user workflows
   - Test data flow between components
   - Test localStorage persistence

6. **Accessibility Tests**
   - Add `@axe-core/react` for automated a11y testing
   - Test keyboard navigation
   - Test screen reader compatibility

### Optional Enhancements

1. **Visual Regression Testing**
   ```bash
   pnpm add -D @storybook/test-runner playwright
   ```

2. **Mock Service Worker (MSW)**
   ```bash
   pnpm add -D msw
   ```
   Set up API mocking for more realistic tests

3. **Test Coverage Reporting**
   - Set up Codecov or Coveralls
   - Add coverage badges to README

4. **CI/CD Integration**
   Add to GitHub Actions:
   ```yaml
   - name: Run tests
     run: pnpm test
   - name: Generate coverage
     run: pnpm test:coverage
   ```

## Troubleshooting

### Tests Fail with "Cannot find module"
- Ensure TypeScript paths match Vitest paths in `vitest.config.ts`
- Check that `@/` alias is correctly configured

### Tests Timeout
- Increase timeout in `vitest.config.ts`
- Check for unresolved promises in async tests
- Use `waitFor()` for async state updates

### Mock Not Working
- Ensure mocks are defined before imports
- Check mock is in `setup.ts` for global mocks
- Use `vi.mock()` for module-level mocks

### Coverage Too Low
- Add tests for untested files
- Focus on critical paths first
- Use `pnpm test:coverage` to identify gaps

### Happy-dom Issues
- Some complex DOM APIs might not be fully supported
- Consider using jsdom for specific tests if needed
- Check happy-dom documentation for compatibility

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Zustand Testing](https://docs.pmnd.rs/zustand/guides/testing)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/vitest)

## Summary

You now have a complete, production-ready testing infrastructure for your Next.js 16 + React 19 application with:

- Vitest configured for fast, modern testing
- React Testing Library for component testing
- Comprehensive mocks for Next.js and browser APIs
- Sample tests demonstrating best practices
- Test utilities for common patterns
- Complete documentation

The setup is optimized for:
- React 19 compatibility
- Next.js App Router
- Zustand state management
- TypeScript
- Accessibility testing
- Fast execution
- Great developer experience

Run `pnpm test` to see it in action!
