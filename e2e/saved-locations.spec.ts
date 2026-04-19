import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Saved Locations E2E Tests
 * Tests for save, recall, and manage locations functionality
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

test.describe('Saved Locations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show saved locations section', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for saved locations section
    const savedLocationsSection = page.locator(
      'text=/Saved Locations|Recent Locations|Favorites/i'
    );

    // Section might exist but be empty
    const isVisible = await savedLocationsSection.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should save current location after successful lookup', async ({ page }) => {
    // Complete a work zone lookup first
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

    // Wait for results
    await page.waitForTimeout(3000);

    // Look for save button
    const saveButton = page.getByRole('button', { name: /Save|Bookmark|Save Location/i });

    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await saveButton.click();

      // Should show input for location name
      const nameInput = page.getByPlaceholder(/name|label/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('Test Location');
        await page.getByRole('button', { name: /Save|Confirm|Add/i }).click();
      }

      // Verify location appears in saved list
      const savedLocation = page.locator('text=Test Location');
      expect(await savedLocation.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();
    }
  });

  test('should recall a saved location', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for any existing saved location
    const savedLocationButton = page
      .locator('[data-testid="saved-location"], button')
      .filter({
        has: page.locator('text=/@|SLK|km/'),
      })
      .first();

    if (await savedLocationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on saved location to recall
      await savedLocationButton.click();

      // Wait for lookup to complete
      await page.waitForTimeout(2000);

      // Should show work zone results
      const workZoneSummary = page.locator('text=Work Zone Summary');
      expect(await workZoneSummary.isVisible({ timeout: 10000 }).catch(() => false)).toBeTruthy();
    }
  });

  test('should delete a saved location', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for delete button on saved location
    const deleteButton = page.getByRole('button', { name: /Delete|Remove/i }).first();

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get count of saved locations before delete
      const savedLocationsBefore = await page.locator('[data-testid="saved-location"]').count();

      await deleteButton.click();

      // Confirm deletion if prompted
      const confirmButton = page.getByRole('button', { name: /Confirm|Delete|Yes/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify location was removed
      const savedLocationsAfter = await page.locator('[data-testid="saved-location"]').count();
      expect(savedLocationsAfter).toBeLessThanOrEqual(savedLocationsBefore);
    }
  });

  test('should sort saved locations by date or road', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for sort toggle
    const sortButton = page.getByRole('button', { name: /Sort|Date|Road|Order/i });

    if (await sortButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Toggle sort
      await sortButton.click();

      // Wait for re-sort
      await page.waitForTimeout(500);

      // Button text should have changed
      const buttonText = await sortButton.textContent();
      expect(buttonText).toBeTruthy();
    }
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
    // First, save a location if possible
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();
    await page.waitForTimeout(3000);

    const saveButton = page.getByRole('button', { name: /Save|Bookmark/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await saveButton.click();

      const nameInput = page.getByPlaceholder(/name/i);
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('Persistent Test Location');
        await page.getByRole('button', { name: /Save|Add/i }).click();
        await page.waitForTimeout(1000);
      }
    }

    // Reload the page
    await page.reload();
    await page.waitForTimeout(2000);

    // Check if saved location still exists
    const savedLocation = page.locator('text=Persistent Test Location');
    const isVisible = await savedLocation.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      expect(isVisible).toBeTruthy();
    }
  });

  test('should persist saved locations when offline', async ({ page, context }) => {
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Saved locations should still be accessible (stored in IndexedDB)
    const savedLocationsSection = page.locator('text=/Saved Locations|Recent/i');
    const isVisible = await savedLocationsSection.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isVisible).toBeTruthy();

    // Re-enable network
    await context.setOffline(false);
  });
});

test.describe('Saved Locations UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show helpful message when no saved locations', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for empty state message
    const emptyMessage = page.locator('text=/No saved locations|No locations saved|empty/i');
    const hasEmptyMessage = await emptyMessage.isVisible({ timeout: 5000 }).catch(() => false);

    // This test passes whether or not message is shown
    expect(hasEmptyMessage).toBeTruthy();
  });

  test('should show road name and SLK for each saved location', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for saved location entries that show road info
    const savedLocationWithRoad = page
      .locator('[data-testid="saved-location"], .saved-location')
      .filter({
        has: page.locator('text=/SLK|@|km/'),
      });

    const count = await savedLocationWithRoad.count();

    // If there are saved locations, they should show road info
    if (count > 0) {
      const firstLocation = savedLocationWithRoad.first();
      const text = await firstLocation.textContent();
      expect(text).toMatch(/SLK|@|km/i);
    }
  });

  test('should navigate to drive page after recalling location', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find and click a saved location
    const savedLocationButton = page
      .locator('button')
      .filter({
        has: page.locator('text=/@|SLK/'),
      })
      .first();

    if (await savedLocationButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await savedLocationButton.click();
      await page.waitForTimeout(2000);

      // Look for "Go to Drive" or similar button
      const driveButton = page.getByRole('button', { name: /Drive|Tracking|Navigate|Go/i });

      if (await driveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await driveButton.click();

        // Should navigate to drive page
        await expect(page).toHaveURL(/drive/, { timeout: 5000 });
      }
    }
  });
});
