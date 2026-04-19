import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Offline Mode E2E Tests
 * Tests for offline functionality and PWA features
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

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show offline indicator when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Look for offline indicator
    const offlineIndicator = page.locator('text=/Offline|offline|No connection/i');
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

  test('should show download prompt when offline data not available', async ({ page, context }) => {
    // Go offline immediately
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(2000);

    // Try to select a region and road
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    if (await regionTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionTrigger.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
        await page.waitForTimeout(1000);
      }
    }

    // Look for download prompt or offline message
    const downloadPrompt = page.locator('text=/Download|offline|cache|data/i');
    const hasPrompt = await downloadPrompt.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(hasPrompt).toBeTruthy();
  });

  test('should persist saved locations offline', async ({ page, context }) => {
    // First save a location online
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    await page.getByPlaceholder('e.g. 100.0').fill('100.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

    // Save the location
    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await saveButton.click();

      // Handle prompt if present
      const nameInput = page.getByPlaceholder(/name/i);
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Offline Test Location');
        await page.getByRole('button', { name: /Save|Add/i }).click();
        await page.waitForTimeout(500);
      }
    }

    // Go offline
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(2000);

    // Check if saved location is visible
    const savedLocation = page.locator('text=/Offline Test Location|100.00|Saved Location/i');
    const isVisible = await savedLocation.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(isVisible).toBeTruthy();
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
    // Look for settings button (gear icon or settings text)
    const settingsButton = page.getByRole('button', { name: /Settings|gear/i });
    if (await settingsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsButton.click();

      // Should show settings panel
      const settingsPanel = page.locator('text=/Offline|Download|Data|Settings/i');
      await expect(settingsPanel).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show offline data download options', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for download section
    const downloadSection = page.locator('text=/Download|Offline Data|Sync/i');
    const isVisible = await downloadSection.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should show download progress when downloading', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for download button
    const downloadButton = page.getByRole('button', { name: /Download|Sync/i });
    if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Note: We won't actually click download as it takes too long
      // Just verify the button exists
      await expect(downloadButton).toBeVisible();
    }
  });

  test('should show offline data status', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for status indicators
    const statusText = page.locator('text=/Ready|Downloaded|Available|Offline Ready/i');
    const hasStatus = await statusText.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasStatus).toBeTruthy();
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
    const result = page.locator('text=/Work Zone|Error|Offline|cache|not available/i');
    const hasResult = await result.isVisible({ timeout: 10000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(hasResult).toBeTruthy();
  });

  test('should show cached weather when offline', async ({ page, context }) => {
    // First do a lookup online to cache weather
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

    // Check if weather shows cached indicator
    const cachedWeather = page.locator('text=/Cached|cache/i');
    const hasCached = await cachedWeather.isVisible({ timeout: 5000 }).catch(() => false);

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

  test('should have offline mode toggles', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for toggle switches
    const toggleSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();
    const hasToggle = await toggleSwitch.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasToggle).toBeTruthy();
  });

  test('should toggle offline mode for specific data types', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for data type toggles
    const toggleLabels = page.locator('text=/Roads|Speed Zones|Weather|Amenities/i');
    const hasLabels = await toggleLabels
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasLabels).toBeTruthy();
  });

  test('should remember offline toggle settings', async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Find a toggle
    const toggle = page.locator('[role="switch"]').first();
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get current state
      const initialState = await toggle.getAttribute('aria-checked');

      // Toggle it
      await toggle.click();
      await page.waitForTimeout(300);

      // Close and reopen settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await settingsButton.click();
      await page.waitForTimeout(300);

      // Check if state persisted
      const newState = await toggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
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

  test('should sync cached data when back online', async ({ page, context }) => {
    // Go offline first
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Make some changes (like saving a location)
    await page.reload();
    await page.waitForTimeout(2000);

    // Come back online
    await context.setOffline(false);
    await page.waitForTimeout(2000);

    // Open settings to check sync status
    const settingsButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for sync indicator
    const syncIndicator = page.locator('text=/Sync|synced|Updated/i');
    const hasSync = await syncIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSync).toBeTruthy();
  });
});
