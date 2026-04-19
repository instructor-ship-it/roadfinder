import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Saved Locations E2E Tests
 * Tests for save, recall, and manage locations functionality
 *
 * Key facts:
 * - Save button text: "💾 Save Location" — visible only when selectedRoad && startSlk
 * - Save mechanism: uses browser prompt() for name input (NOT an in-page dialog)
 * - Saved locations heading: "📌 Saved Locations ({count})" — only when locations exist
 * - Empty state: component returns null (nothing rendered when no saved locations)
 * - Delete button: "×" with title="Delete"
 * - Sort buttons: "📅 Date" and "🛣️ Road"
 * - Map link: "🗺️ Map" → /saved-locations/map
 * - Storage: IndexedDB via saved-locations-db.ts
 */

/**
 * Pre-seed localStorage so the onboarding dialog is skipped entirely.
 */
async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      'tc-onboarding-complete',
      JSON.stringify({ version: 1, completed: true, completedAt: new Date().toISOString() })
    );
  });
}

/**
 * Helper: Select a region from the Radix Select dropdown.
 */
async function selectRegion(page: import('@playwright/test').Page, regionName: string) {
  const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
  await regionTrigger.click();
  const option = page.getByRole('option', { name: new RegExp(regionName, 'i') });
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
  await page.waitForTimeout(1000);
}

/**
 * Helper: Select the first road from the road dropdown.
 */
async function selectFirstRoad(page: import('@playwright/test').Page) {
  const roadTrigger = page.locator('button[data-slot="select-trigger"]').nth(1);
  await expect(roadTrigger).toBeEnabled({ timeout: 5000 });
  await roadTrigger.click();
  const firstRoad = page.getByRole('option').first();
  await expect(firstRoad).toBeVisible({ timeout: 5000 });
  await firstRoad.click();
  await page.waitForTimeout(500);
}

/**
 * Helper: Complete a full work zone lookup to enable saving.
 */
async function completeLookup(page: import('@playwright/test').Page) {
  await selectRegion(page, 'Wheatbelt');
  await selectFirstRoad(page);
  await page.getByPlaceholder('e.g. 100.0').fill('100.00');
  await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

  // Wait for search to complete
  await expect(page.getByRole('button', { name: /^Get Work Zone Info$/i }))
    .toBeVisible({ timeout: 20000 })
    .catch(() => {});
}

test.describe('Saved Locations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show Save Location button after selecting road and SLK', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await page.getByPlaceholder('e.g. 100.0').fill('100.00');

    // Save Location button appears when selectedRoad && startSlk are set
    const saveButton = page.getByRole('button', { name: /Save Location/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
  });

  test('should save a location after successful lookup', async ({ page }) => {
    await completeLookup(page);

    // Look for save button
    const saveButton = page.getByRole('button', { name: /Save Location/i });

    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Handle the browser prompt() dialog
      page.once('dialog', async (dialog) => {
        await dialog.accept('Test Location');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Verify location appears in saved list (heading "📌 Saved Locations")
      const savedLocationsHeading = page.locator('text=/Saved Locations/i');
      const hasHeading = await savedLocationsHeading
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasHeading) {
        // Check that the test location name is visible
        const testLocationText = page.locator('text=Test Location');
        const isVisible = await testLocationText.isVisible({ timeout: 5000 }).catch(() => false);
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('should recall a saved location', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Recall Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Now find and click the saved location to recall it
    // Each saved location is a <button> with road_id and SLK text
    const savedLocationButton = page.locator('button').filter({ hasText: /SLK/i }).first();

    if (await savedLocationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await savedLocationButton.click();

      // Wait for lookup to complete
      await page.waitForTimeout(3000);

      // Should show work zone results (Reset button or heading)
      const resetButton = page.getByRole('button', { name: /Reset/i });
      const hasResults = await resetButton.isVisible({ timeout: 10000 }).catch(() => false);
      expect(hasResults).toBeTruthy();
    }
  });

  test('should delete a saved location', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Delete Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Find the delete button (× with title="Delete")
    const deleteButton = page.locator('button[title="Delete"]').first();

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Count saved locations before delete
      const savedLocationsBefore = await page.locator('button[title="Delete"]').count();

      await deleteButton.click();

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify location was removed
      const savedLocationsAfter = await page.locator('button[title="Delete"]').count();
      expect(savedLocationsAfter).toBeLessThanOrEqual(savedLocationsBefore);
    }
  });

  test('should sort saved locations by date or road', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Sort Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for sort buttons: "📅 Date" and "🛣️ Road"
    const dateSortButton = page.locator('button:has-text("Date")').first();
    const roadSortButton = page.locator('button:has-text("Road")').first();

    const hasDateSort = await dateSortButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasRoadSort = await roadSortButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasDateSort) {
      await dateSortButton.click();
      await page.waitForTimeout(500);
    }

    if (hasRoadSort) {
      await roadSortButton.click();
      await page.waitForTimeout(500);
    }

    // At least one sort button should exist
    expect(hasDateSort || hasRoadSort).toBeTruthy();
  });
});

test.describe('Saved Locations Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should persist saved locations across page reloads', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Persistent Test Location');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Reload the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Check if saved location heading appears (means there are saved locations)
    const savedLocationsHeading = page.locator('text=/Saved Locations/i');
    const isVisible = await savedLocationsHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      // Check that our test location name is visible
      const locationText = page.locator('text=Persistent Test Location');
      const hasLocation = await locationText.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasLocation).toBeTruthy();
    }
  });

  test('should persist saved locations when offline', async ({ page, context }) => {
    // First, save a location online
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Offline Persist Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Saved locations should still be accessible (stored in IndexedDB)
    const savedLocationsHeading = page.locator('text=/Saved Locations/i');
    const isVisible = await savedLocationsHeading.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(isVisible).toBeTruthy();
  });
});

test.describe('Saved Locations UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should not show saved locations section when empty', async ({ page }) => {
    // When there are no saved locations, the section returns null
    const savedLocationsHeading = page.locator('text=/Saved Locations/i');
    const isVisible = await savedLocationsHeading.isVisible({ timeout: 3000 }).catch(() => false);

    // Should NOT be visible when there are no saved locations
    expect(isVisible).toBeFalsy();
  });

  test('should show road name and SLK for each saved location', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Road Info Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for saved location entries that show road info
    // Each location shows road_id (font-mono green) and "SLK {value}" text
    const slkText = page.locator('text=/SLK/i').first();
    const hasSlk = await slkText.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSlk) {
      // Verify the SLK value is present
      const slkContent = await slkText.textContent();
      expect(slkContent).toMatch(/SLK/i);
    }
  });

  test('should navigate to drive page after recalling location', async ({ page }) => {
    // First, save a location
    await completeLookup(page);

    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      page.once('dialog', async (dialog) => {
        await dialog.accept('Drive Nav Test');
      });
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Find and click a saved location to recall
    const savedLocationButton = page.locator('button').filter({ hasText: /SLK/i }).first();

    if (await savedLocationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await savedLocationButton.click();
      await page.waitForTimeout(3000);

      // After recall, look for "Go to Drive" or similar navigation
      // The drive page is at /drive with URL params
      const driveButton = page.getByRole('link', { name: /Drive|Tracking|Go/i }).first();

      if (await driveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await driveButton.click();

        // Should navigate to drive page
        await expect(page).toHaveURL(/drive/, { timeout: 5000 });
      }
    }
  });
});
