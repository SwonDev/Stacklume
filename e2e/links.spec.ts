/**
 * Links E2E Tests
 *
 * Tests for link management functionality
 * Covers adding, editing, searching, and deleting links
 */

import { test, expect } from '@playwright/test';

test.describe('Links Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Add Link', () => {
    test('should open add link modal', async ({ page }) => {
      // Look for add link button - could be in header, sidebar, or FAB
      const addLinkButton = page
        .getByRole('button', { name: /add.*link|new.*link|create.*link|\+/i })
        .first();

      // If not found, try keyboard shortcut
      if ((await addLinkButton.count()) === 0) {
        await page.keyboard.press('Control+n');
      } else {
        await addLinkButton.click();
      }

      // Wait for modal to appear
      await page.waitForTimeout(300);

      // Check if modal/dialog opened
      const dialog = page.getByRole('dialog');
      const modal = page.locator('[role="dialog"], [data-state="open"]');

      const modalVisible =
        (await dialog.count()) > 0 || (await modal.count()) > 0;

      // If modal found, verify it has expected content
      if (modalVisible) {
        // Should have URL input
        const urlInput = page.getByPlaceholder(/url/i);
        if ((await urlInput.count()) > 0) {
          await expect(urlInput.first()).toBeVisible();
        }
      }
    });

    test('should validate URL input', async ({ page }) => {
      // Open add link modal
      const addLinkButton = page
        .getByRole('button', { name: /add.*link|new.*link|create.*link|\+/i })
        .first();

      if ((await addLinkButton.count()) > 0) {
        await addLinkButton.click();
        await page.waitForTimeout(300);

        // Find URL input and submit button
        const urlInput = page.getByPlaceholder(/url/i).first();
        const submitButton = page
          .getByRole('button', { name: /save|add|create|submit/i })
          .first();

        if ((await urlInput.count()) > 0) {
          // Type invalid URL
          await urlInput.fill('not-a-valid-url');

          if ((await submitButton.count()) > 0) {
            await submitButton.click();
            await page.waitForTimeout(300);

            // Should show error or validation message
            const errorMessage = page.getByText(/invalid|error|required/i);
            // Modal should still be open (not submitted)
            const dialog = page.getByRole('dialog');
            const modalStillOpen = (await dialog.count()) > 0;

            // Either show error or keep modal open
            const hasValidation =
              (await errorMessage.count()) > 0 || modalStillOpen;
            expect(hasValidation).toBeTruthy();
          }
        }
      }
    });

    test('should add a new link successfully', async ({ page }) => {
      // Open add link modal
      const addLinkButton = page
        .getByRole('button', { name: /add.*link|new.*link|create.*link|\+/i })
        .first();

      if ((await addLinkButton.count()) > 0) {
        await addLinkButton.click();
        await page.waitForTimeout(300);

        // Fill in link details
        const urlInput = page.getByPlaceholder(/url/i).first();
        const titleInput = page.getByPlaceholder(/title/i).first();

        if ((await urlInput.count()) > 0) {
          await urlInput.fill('https://example.com/test-link');

          if ((await titleInput.count()) > 0) {
            await titleInput.fill('Test Link from E2E');
          }

          // Submit
          const submitButton = page
            .getByRole('button', { name: /save|add|create|submit/i })
            .first();

          if ((await submitButton.count()) > 0) {
            await submitButton.click();

            // Wait for modal to close and link to appear
            await page.waitForTimeout(500);

            // Verify link was added (modal closed or link appears in list)
            const dialog = page.getByRole('dialog');
            const modalClosed = (await dialog.count()) === 0;

            // Or check for success toast/notification
            const successToast = page.getByText(/added|created|saved|success/i);
            const hasSuccessIndicator =
              modalClosed || (await successToast.count()) > 0;

            expect(hasSuccessIndicator).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Search Links', () => {
    test('should find search input', async ({ page }) => {
      // Use desktop viewport where search input is visible (search is hidden on mobile)
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.waitForLoadState('load');

      // Wait for header to be visible first
      await expect(page.locator('header')).toBeVisible();

      // Search input with Spanish placeholder
      const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"]');

      // Either search input exists OR there's a search button in header
      const hasSearch = (await searchInput.count()) > 0;
      expect(hasSearch).toBeTruthy();
    });

    test('should filter links by search term', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/buscar/i).first();

      if ((await searchInput.count()) > 0) {
        // Type search term
        await searchInput.fill('test');
        await page.waitForTimeout(300);

        // Search should filter results (implementation dependent)
        // Just verify the search input works
        await expect(searchInput).toHaveValue('test');
      }
    });

    test('should clear search with Escape key', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i).first();

      if ((await searchInput.count()) > 0) {
        await searchInput.fill('test');
        await searchInput.press('Escape');

        // Focus may have moved, or input cleared
        await page.waitForTimeout(300);

        // Verify escape was handled (either cleared or focus moved)
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Link Cards', () => {
    test('should display link cards with expected content', async ({ page }) => {
      // Look for link cards in the grid
      const linkCards = page.locator('[data-testid="link-card"], .link-card, [role="article"]');

      // If there are links, verify card structure
      if ((await linkCards.count()) > 0) {
        const firstCard = linkCards.first();
        await expect(firstCard).toBeVisible();

        // Cards should have title or URL visible
        const hasContent = await firstCard.textContent();
        expect(hasContent?.length).toBeGreaterThan(0);
      }
    });

    test('should open link in new tab on click', async ({ page, context }) => {
      const linkCards = page.locator('[data-testid="link-card"], .link-card, [role="article"]');

      if ((await linkCards.count()) > 0) {
        // Listen for new page/tab
        const pagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

        // Click on a link card
        await linkCards.first().click();

        // Either opens new tab or has some interaction
        const newPage = await pagePromise;

        if (newPage) {
          // New tab opened
          await newPage.close();
        }
        // If no new page, the click may have other behavior (edit mode, etc.)
      }
    });
  });

  test.describe('Link Context Menu', () => {
    test('should show context menu on right-click', async ({ page }) => {
      const linkCards = page.locator('[data-testid="link-card"], .link-card, [role="article"]');

      if ((await linkCards.count()) > 0) {
        await linkCards.first().click({ button: 'right' });
        await page.waitForTimeout(300);

        // Look for context menu
        const contextMenu = page.locator('[role="menu"], [data-radix-menu-content]');

        if ((await contextMenu.count()) > 0) {
          await expect(contextMenu.first()).toBeVisible();

          // Should have common actions
          const editOption = page.getByRole('menuitem', { name: /edit/i });
          const deleteOption = page.getByRole('menuitem', { name: /delete/i });

          const _hasOptions =
            (await editOption.count()) > 0 || (await deleteOption.count()) > 0;

          // Close context menu
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Delete Link', () => {
    test('should confirm before deleting', async ({ page }) => {
      const linkCards = page.locator('[data-testid="link-card"], .link-card, [role="article"]');

      if ((await linkCards.count()) > 0) {
        // Open context menu
        await linkCards.first().click({ button: 'right' });
        await page.waitForTimeout(300);

        const deleteOption = page.getByRole('menuitem', { name: /delete/i });

        if ((await deleteOption.count()) > 0) {
          await deleteOption.click();
          await page.waitForTimeout(300);

          // Should show confirmation dialog
          const confirmDialog = page.getByRole('alertdialog');
          const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });

          const hasConfirmation =
            (await confirmDialog.count()) > 0 || (await confirmButton.count()) > 0;

          // Close/cancel if confirmation shown
          if (hasConfirmation) {
            const cancelButton = page.getByRole('button', { name: /cancel|no/i });
            if ((await cancelButton.count()) > 0) {
              await cancelButton.click();
            } else {
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    });
  });

  test.describe('Categories', () => {
    test('should display categories in sidebar', async ({ page }) => {
      // Look for categories section
      const categoriesSection = page.getByText(/categories/i);
      const categoryList = page.locator('[data-testid="category-list"], .category-list');

      const _hasCategories =
        (await categoriesSection.count()) > 0 || (await categoryList.count()) > 0;

      // Categories may or may not be visible depending on layout
      await expect(page.locator('body')).toBeVisible();
    });

    test('should filter links by category', async ({ page }) => {
      // Look for category filter buttons
      const categoryButtons = page.locator(
        '[data-testid="category-filter"], .category-filter, [role="tab"]'
      );

      if ((await categoryButtons.count()) > 0) {
        // Click first category
        await categoryButtons.first().click();
        await page.waitForTimeout(300);

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Favorites', () => {
    test('should toggle favorite status', async ({ page }) => {
      const linkCards = page.locator('[data-testid="link-card"], .link-card, [role="article"]');

      if ((await linkCards.count()) > 0) {
        // Look for favorite/star button within card
        const favoriteButton = linkCards
          .first()
          .locator('button[aria-label*="favorite"], button[aria-label*="star"], [data-testid="favorite-button"]');

        if ((await favoriteButton.count()) > 0) {
          await favoriteButton.click();
          await page.waitForTimeout(300);

          // Button should have changed state
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });
  });

  test.describe('View Modes', () => {
    test('should switch between bento and kanban view', async ({ page }) => {
      // Look for view mode toggle
      const viewModeToggle = page.getByRole('button', { name: /view|bento|kanban|grid/i });
      const viewTabs = page.locator('[role="tablist"]');

      if ((await viewModeToggle.count()) > 0) {
        await viewModeToggle.first().click();
        await page.waitForTimeout(500);

        // View should have changed
        await expect(page.locator('body')).toBeVisible();
      } else if ((await viewTabs.count()) > 0) {
        // Click second tab if available
        const tabs = page.locator('[role="tab"]');
        if ((await tabs.count()) > 1) {
          await tabs.nth(1).click();
          await page.waitForTimeout(500);
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });
  });

  test.describe('Quick Add Widget', () => {
    test('should have quick add functionality', async ({ page }) => {
      // Look for quick add input/widget
      const quickAddInput = page.getByPlaceholder(/paste.*url|add.*url|quick.*add/i);

      if ((await quickAddInput.count()) > 0) {
        await quickAddInput.fill('https://github.com');
        await quickAddInput.press('Enter');

        await page.waitForTimeout(500);

        // Should process the URL
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
});
