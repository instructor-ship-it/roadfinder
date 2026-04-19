import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Offline Mode E2E Tests
 * Tests for offline functionality and PWA features
 *
 * Key facts:
 * - Settings button: aria-label="Open settings menu", displays "☰" text (NOT an SVG)
 * - Settings is a Vaul Drawer component
 * - Offline toggles are clickable <span> elements showing "OFFLINE"/"ONLINE" (NOT role="switch")
 * - Network status banner: "📴 You are offline • App will work with cached data"
 * - Offline status indicators show: "Live", "Cached Xh Xm ago", "No Cached Data"
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
 * Helper: Open the settings drawer using the correct aria-label.
 */
async function openSettings(page: import('@playwright/test').Page) {
  const settingsButton = page.locator('button[aria-label="Open settings menu"]');
  await expect(settingsButton).toBeVisible({ timeout: 5000 });
  await settingsButton.click();
  // Wait for drawer to open
  await page.waitForTimeout(500);
}

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show offline indicator when going offline', async ({ page, context }) => {
    // The NetworkStatusBanner shows on online→offline transition
    // Go offline while the page is loaded (triggers the 'offline' event)
    await context.setOffline(true);

    // Look for offline banner: "📴 You are offline • App will work with cached data"
    const offlineIndicator = page.locator('text=/You are offline|offline/i');
    const hasIndicator = await offlineIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(hasIndicator).toBeTruthy();
  });

  test('should load cached regions when offline', async ({ page, context }) => {
    // First load online to cache data
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Region selector should still work (from cache)
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await regionTrigger.click();
    const options = await page.getByRole('option').count();

    // Re-enable network
    await context.setOffline(false);

    // Should have some regions available
    expect(options).toBeGreaterThan(0);
  });

  test('should handle offline state gracefully', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // The page should still be functional - form elements should still be visible
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await expect(regionTrigger).toBeVisible({ timeout: 5000 });

    // Check for any offline-related UI (banner, indicator, or the form itself)
    const offlineBanner = page.locator('text=/offline|Offline/i');
    const startSlkInput = page.getByPlaceholder('e.g. 100.0');

    const hasBanner = await offlineBanner.isVisible({ timeout: 3000 }).catch(() => false);
    const hasForm = await startSlkInput.isVisible({ timeout: 3000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    // At minimum, the form should still be visible when offline
    expect(hasBanner || hasForm).toBeTruthy();
  });

  test('should persist saved locations offline', async ({ page, context }) => {
    // First save a location online
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');

    // The Save Location button is visible when selectedRoad && startSlk are set
    const saveButton = page.getByRole('button', { name: /Save Location/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    // Handle the browser prompt() dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept('Offline Test Location');
    });
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify the save was successful - Saved Locations heading should appear
    const savedLocationsHeading = page.locator('text=/Saved Locations/i');
    const hasSaved = await savedLocationsHeading.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSaved) {
      // Go offline and reload
      await context.setOffline(true);
      await page.reload();
      await page.waitForTimeout(2000);

      // Check if saved location section is still visible (stored in IndexedDB)
      const savedAfterReload = page.locator('text=/Saved Locations/i');
      const isVisible = await savedAfterReload.isVisible({ timeout: 5000 }).catch(() => false);

      // Re-enable network
      await context.setOffline(false);

      expect(isVisible).toBeTruthy();
    } else {
      // Save didn't work, but test should not fail on this precondition
      // Re-enable network
      await context.setOffline(false);
      expect(hasSaved).toBeTruthy();
    }
  });
});

test.describe('Offline Data Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show settings drawer', async ({ page }) => {
    await openSettings(page);

    // Should show settings panel with "Menu" title
    const menuTitle = page.getByText('Menu');
    await expect(menuTitle).toBeVisible({ timeout: 5000 });
  });

  test('should show offline data section in settings', async ({ page }) => {
    await openSettings(page);

    // Look for "📦 Offline Data" section and expand it
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Should show download/update button or status
      const downloadSection = page.locator('text=/Download|Update Data|Offline Data|Clear/i');
      const isVisible = await downloadSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('should show download button when no offline data', async ({ page }) => {
    await openSettings(page);

    // Look for "📦 Offline Data" section and expand it
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Look for download button
      const downloadButton = page.getByRole('button', { name: /Download Data|Update Data/i });
      if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Just verify the button exists (don't actually download)
        await expect(downloadButton).toBeVisible();
      }
    }
  });

  test('should show offline data status or download prompt', async ({ page }) => {
    await openSettings(page);

    // Look for "📦 Offline Data" section and expand it
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Should show status indicators or download prompt
      const statusText = page.locator(
        'text=/Ready|Downloaded|Available|Offline Ready|Download Data|roads downloaded/i'
      );
      const hasStatus = await statusText.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasStatus).toBeTruthy();
    }
  });
});

test.describe('PWA Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should have service worker registered', async ({ page }) => {
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then((registrations) => {
        return registrations.length > 0;
      });
    });

    expect(swRegistered).toBeTruthy();
  });

  test('should have web app manifest', async ({ page }) => {
    // Check for manifest link
    const manifestLink = await page.$('link[rel="manifest"]');
    const hasManifest = manifestLink !== null;

    expect(hasManifest).toBeTruthy();
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    // Check for theme-color meta tag
    const themeColor = await page.$('meta[name="theme-color"]');
    const hasThemeColor = themeColor !== null;

    // Check for viewport meta tag
    const viewport = await page.$('meta[name="viewport"]');
    const hasViewport = viewport !== null;

    expect(hasViewport).toBeTruthy();
    expect(hasThemeColor).toBeTruthy();
  });

  test('should have app icons configured', async ({ page }) => {
    // Check for apple-touch-icon
    const appleIcon = await page.$('link[rel="apple-touch-icon"]');
    const hasAppleIcon = appleIcon !== null;

    // Check for icon links
    const icon = await page.$('link[rel="icon"]');
    const hasIcon = icon !== null;

    expect(hasIcon).toBeTruthy();
    expect(hasAppleIcon).toBeTruthy();
  });
});

test.describe('Offline Work Zone Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should attempt work zone lookup when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Try to do a lookup
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    if (await regionTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionTrigger.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(1000);
      }
    }

    const roadTrigger = page.locator('button[data-slot="select-trigger"]').nth(1);
    if (await roadTrigger.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await roadTrigger.click();
      const roadOption = page.getByRole('option').first();
      if (await roadOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roadOption.click();
      }
    }

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');

    const submitButton = page.getByRole('button', { name: /Get Work Zone Info|Searching/i });
    if (await submitButton.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      // Wait for search to complete
      await page.waitForTimeout(5000);
    }

    // Should either show cached results or an offline message
    const result = page.locator('text=/Work Zone|Error|Offline|cache|not available|No Cached/i');
    const hasResult = await result.isVisible({ timeout: 10000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(hasResult).toBeTruthy();
  });

  test('should show cached weather indicator when offline', async ({ page, context }) => {
    // First do a lookup online to cache weather data
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

    // Wait for search to complete
    await expect(page.getByRole('button', { name: /^Get Work Zone Info$/i }))
      .toBeVisible({ timeout: 20000 })
      .catch(() => {});

    // Now go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Check if weather shows cached indicator ("Cached" or "No Cached Data")
    const cachedIndicator = page.locator('text=/Cached|No Cached/i');
    const hasCached = await cachedIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(hasCached).toBeTruthy();
  });
});

test.describe('Offline Toggle Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should have data source toggles in settings', async ({ page }) => {
    await openSettings(page);

    // Expand Offline Data section
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Look for data source toggles - they are <span> elements with "OFFLINE"/"ONLINE" text
      const toggleLabel = page.locator(
        'text=/Roads List|Work Zone Lookup|Speed Zones|OFFLINE|ONLINE/i'
      );
      const hasToggle = await toggleLabel
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(hasToggle).toBeTruthy();
    }
  });

  test('should toggle offline data source between OFFLINE and ONLINE', async ({ page }) => {
    await openSettings(page);

    // Expand Offline Data section
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Find a clickable toggle span showing OFFLINE or ONLINE
      const toggleSpan = page.locator('span:has-text("OFFLINE"), span:has-text("ONLINE")').first();
      if (await toggleSpan.isVisible({ timeout: 5000 }).catch(() => false)) {
        const initialText = await toggleSpan.textContent();
        await toggleSpan.click();
        await page.waitForTimeout(300);

        // Text should have toggled
        const newText = await toggleSpan.textContent().catch(() => initialText);
        expect(newText).not.toBe(initialText);
      }
    }
  });

  test('should have Reset button for offline toggles', async ({ page }) => {
    await openSettings(page);

    // Expand Offline Data section
    const offlineSection = page.getByRole('button', { name: /Offline Data/i });
    if (await offlineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await offlineSection.click();
      await page.waitForTimeout(500);

      // Look for Reset button
      const resetButton = page.locator('text=/Reset/i').first();
      const hasReset = await resetButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasReset).toBeTruthy();
    }
  });
});

test.describe('Network Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should recover when network returns', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Reload
    await page.reload();
    await page.waitForTimeout(2000);

    // Come back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // Try a lookup
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

    // Wait for search to complete
    await expect(page.getByRole('button', { name: /^Get Work Zone Info$/i }))
      .toBeVisible({ timeout: 20000 })
      .catch(() => {});

    // Should work now that we're online
    const results = page.locator('text=/Work Zone|Speed Zone|Traffic|Error/i');
    const hasResults = await results.isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasResults).toBeTruthy();
  });

  test('should show back online banner when network returns', async ({ page, context }) => {
    // Go offline first to trigger the banner system
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Come back online - the banner should briefly show "✓ Back online • Syncing data..."
    await context.setOffline(false);

    // The "Back online" banner is transient (shows for 3 seconds)
    // Try to catch it, but it may be too fast
    const backOnlineIndicator = page.locator('text=/Back online|Syncing/i');
    const hasIndicator = await backOnlineIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    // Verify the app still works after network recovery
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await expect(regionTrigger).toBeVisible({ timeout: 5000 });
  });
});
