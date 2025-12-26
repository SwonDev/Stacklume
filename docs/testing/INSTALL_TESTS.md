# Test Setup Installation Instructions

## Step 1: Install Dependencies

Run this command to install all required testing dependencies:

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react happy-dom
```

### What Gets Installed

- **vitest** (latest) - Fast unit test framework with native ESM support
- **@testing-library/react** (latest) - React component testing utilities
- **@testing-library/jest-dom** (latest) - Custom Jest matchers for DOM assertions
- **@testing-library/user-event** (latest) - Advanced user interaction simulation
- **jsdom** (latest) - JavaScript DOM implementation (fallback)
- **@vitejs/plugin-react** (latest) - Vite plugin for React with Fast Refresh
- **happy-dom** (latest) - Fast DOM implementation optimized for testing (primary)

### Optional Dependencies

For enhanced testing capabilities:

```bash
# For visual regression testing
pnpm add -D @storybook/test-runner

# For API mocking
pnpm add -D msw

# For accessibility testing
pnpm add -D @axe-core/react
```

## Step 2: Verify Installation

After installation, verify the packages were added:

```bash
pnpm list vitest @testing-library/react
```

You should see output similar to:
```
stacklume C:\...\Stacklume
├── @testing-library/react 16.1.0
└── vitest 3.0.0
```

## Step 3: Run Tests

All configuration files and sample tests are already in place. Run:

```bash
# Run all tests
pnpm test
```

You should see output like:
```
✓ src/lib/url-utils.test.ts (50 tests)
✓ src/stores/links-store.test.ts (20 tests)
✓ src/components/ui/button.test.tsx (30 tests)

Test Files  3 passed (3)
     Tests  100 passed (100)
```

## Step 4: Try Other Test Commands

```bash
# Watch mode (great for development)
pnpm test:watch

# Interactive UI (opens in browser)
pnpm test:ui

# Coverage report
pnpm test:coverage
```

## Files Created

The following files have been created for you:

### Configuration Files
- `vitest.config.ts` - Main Vitest configuration
- `src/test/setup.ts` - Global test setup and mocks
- `src/test/test-utils.tsx` - Custom testing utilities

### Documentation
- `src/test/README.md` - Comprehensive testing guide
- `TESTING_SETUP.md` - Complete setup documentation
- `INSTALL_TESTS.md` - This file

### Sample Tests
- `src/stores/links-store.test.ts` - Zustand store testing example
- `src/components/ui/button.test.tsx` - Component testing example
- `src/lib/url-utils.test.ts` - Utility function testing example

### Updated Files
- `package.json` - Added test scripts (test, test:watch, test:ui, test:coverage)

## Troubleshooting Installation

### Issue: pnpm command not found
```bash
npm install -g pnpm
```

### Issue: Version conflicts
```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Issue: TypeScript errors in test files
```bash
# Ensure TypeScript is up to date
pnpm add -D typescript@latest

# Restart your TypeScript server in VS Code
# Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

### Issue: Tests don't run
```bash
# Verify Vitest is installed
pnpm list vitest

# Try running with verbose output
pnpm test --reporter=verbose

# Check for syntax errors
pnpm tsc --noEmit
```

### Issue: Module resolution errors
The `vitest.config.ts` file includes path aliases matching your `tsconfig.json`. If you see "Cannot find module '@/...'" errors:

1. Check that `tsconfig.json` has the same path aliases
2. Restart your editor
3. Try: `pnpm test --no-cache`

## Next Steps After Installation

1. **Run the tests** to verify everything works:
   ```bash
   pnpm test
   ```

2. **Try watch mode** for interactive development:
   ```bash
   pnpm test:watch
   ```

3. **Generate coverage report** to see what's tested:
   ```bash
   pnpm test:coverage
   ```
   Then open `coverage/index.html` in your browser

4. **Read the testing guide** in `src/test/README.md`

5. **Write your first test** - Copy one of the sample tests and modify it for your needs

6. **Set up CI/CD** - Add test command to your GitHub Actions or other CI:
   ```yaml
   - name: Run tests
     run: pnpm test
   ```

## IDE Setup

### VS Code Extensions

Install these recommended extensions for the best testing experience:

1. **Vitest** (vitest.explorer)
   - Run tests directly from VS Code
   - See test status in the editor
   - Debug tests with breakpoints

2. **Jest Runner** (compatible with Vitest)
   - Quick test file execution
   - Code lens for running individual tests

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "vitest.enable": true,
  "vitest.commandLine": "pnpm test",
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

## Verification Checklist

After installation, verify:

- [ ] Dependencies installed: `pnpm list vitest`
- [ ] Tests run successfully: `pnpm test`
- [ ] Watch mode works: `pnpm test:watch` (Ctrl+C to exit)
- [ ] Coverage generates: `pnpm test:coverage`
- [ ] No TypeScript errors in test files
- [ ] IDE recognizes test files
- [ ] Can import test utilities: `import { render } from '@testing-library/react'`

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Read `src/test/README.md` for detailed guidance
3. Review `TESTING_SETUP.md` for comprehensive documentation
4. Check [Vitest documentation](https://vitest.dev/)
5. Check [React Testing Library docs](https://testing-library.com/react)

## Quick Reference

```bash
# Install dependencies (run once)
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react happy-dom

# Run tests (common commands)
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:ui           # Interactive UI
pnpm test:coverage     # With coverage

# Run specific test file
pnpm test src/stores/links-store.test.ts

# Run tests matching pattern
pnpm test --grep "should render"

# Debug tests
pnpm test --inspect-brk
```

## Success!

If you've completed all steps and the tests pass, your testing setup is complete! You now have:

- A modern, fast testing framework (Vitest)
- Component testing utilities (React Testing Library)
- Comprehensive mocks for Next.js features
- Sample tests demonstrating best practices
- Complete documentation

Start writing tests for your features and enjoy the confidence that comes with a well-tested codebase!
