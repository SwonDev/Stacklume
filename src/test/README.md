# Testing Guide for Stacklume

This directory contains the testing infrastructure and utilities for the Stacklume application.

## Setup

The test environment is configured with:

- **Vitest**: Fast unit test framework with ESM support
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **happy-dom**: Lightweight DOM implementation optimized for React 19

## Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode (automatically re-runs on file changes)
pnpm test:watch

# Run tests with UI (interactive browser interface)
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## File Structure

```
src/test/
├── setup.ts          # Global test setup and mocks
├── test-utils.tsx    # Custom render functions and test helpers
└── README.md         # This file
```

## Writing Tests

### Component Tests

Use React Testing Library to test components from a user's perspective:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should handle user clicks', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<MyComponent onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Zustand Store Tests

Test state management logic directly:

```typescript
import { useMyStore } from './my-store';

describe('useMyStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useMyStore.setState({ items: [] });
  });

  it('should add item to store', () => {
    const item = { id: '1', name: 'Test' };

    useMyStore.getState().addItem(item);

    expect(useMyStore.getState().items).toContain(item);
  });
});
```

### Using Custom Render with Providers

When components need providers (theme, etc.):

```typescript
import { renderWithProviders, screen } from '@/test/test-utils';

it('should render with dark theme', () => {
  renderWithProviders(<MyComponent />, { theme: 'dark' });

  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Testing Async Behavior

```typescript
import { waitFor } from '@testing-library/react';

it('should load data', async () => {
  global.fetch = vi.fn().mockResolvedValue(
    createMockResponse({ data: 'test' })
  );

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// Good: Test what the user sees
const button = screen.getByRole('button', { name: /submit/i });

// Bad: Test implementation details
const button = wrapper.find('.submit-button');
```

### 2. Use Accessible Queries

Priority order for queries:
1. `getByRole` - Accessible queries
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Input placeholders
4. `getByText` - Text content
5. `getByTestId` - Last resort

### 3. Simulate Real User Interactions

```typescript
const user = userEvent.setup();

// Good: Simulates real typing
await user.type(input, 'Hello World');

// Less ideal: Direct value change
fireEvent.change(input, { target: { value: 'Hello World' } });
```

### 4. Clean Up Between Tests

The `afterEach` hook in `setup.ts` automatically cleans up:
- Unmounts React components
- Clears mocks
- Resets DOM

### 5. Test Edge Cases

```typescript
describe('MyForm', () => {
  it('should handle valid input', () => { /* ... */ });
  it('should show error for invalid input', () => { /* ... */ });
  it('should handle empty submission', () => { /* ... */ });
  it('should disable button while loading', () => { /* ... */ });
});
```

## Mocking

### Next.js Mocks

Next.js specific features are mocked in `setup.ts`:
- `next/navigation` - Router, pathname, search params
- `next/image` - Image component
- `next/link` - Link component

### API Mocks

```typescript
import { vi } from 'vitest';
import { createMockResponse } from '@/test/test-utils';

global.fetch = vi.fn().mockResolvedValue(
  createMockResponse({ success: true })
);
```

### localStorage/sessionStorage

Automatically mocked in `setup.ts`. Access via normal `localStorage` API.

### Window APIs

The following are mocked in `setup.ts`:
- `window.matchMedia` - For responsive/theme tests
- `IntersectionObserver` - For lazy loading
- `ResizeObserver` - For responsive components
- `window.open` - For link opening tests

## Coverage

Coverage reports are generated in `coverage/` directory when running `pnpm test:coverage`.

Current thresholds:
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

These can be adjusted in `vitest.config.ts`.

## Debugging Tests

### Run a single test file

```bash
pnpm test path/to/test.test.ts
```

### Run tests matching a pattern

```bash
pnpm test --grep "should render"
```

### Debug with UI

```bash
pnpm test:ui
```

### View verbose output

```bash
pnpm test --reporter=verbose
```

## Common Patterns

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<MyForm onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });
});
```

### Testing Loading States

```typescript
it('should show loading spinner', async () => {
  const mockFetch = vi.fn(() =>
    new Promise(resolve => setTimeout(() => resolve(createMockResponse({})), 100))
  );
  global.fetch = mockFetch;

  render(<MyComponent />);

  expect(screen.getByRole('status')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
```

### Testing Error States

```typescript
it('should display error message', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Tests timing out

Increase timeout in `vitest.config.ts` or specific test:

```typescript
it('long running test', async () => {
  // Test code
}, 10000); // 10 second timeout
```

### Mock not working

Ensure mock is defined before component import:

```typescript
vi.mock('./my-module', () => ({ /* ... */ }));
import { MyComponent } from './MyComponent'; // Import after mock
```

### State not updating

Use `waitFor` for async state updates:

```typescript
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)
