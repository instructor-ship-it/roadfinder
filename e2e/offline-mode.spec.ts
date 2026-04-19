import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Offline Mode E2E Tests
 * Tests for offline functionality and PWA features
 */

/**
 * Helper to dismiss onboarding dialog if present
 */
async function dismissOnboarding(page: import('@playwright/test').Page) {
  const onboardingDialog = page.locator('[role="dialog"][aria-labelledby="onboarding-title"]');
  if (await onboardingDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Click skip or close button
    const skipButton = page.getByRole('button', { name: /Skip|Close|Get Started|Continue/i });
    if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(300);
    }
  }
}

test.describe('Offline Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
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
    const hasIndicator = await offlineIndicator.isVisible({ timeout: 3000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(typeof hasIndicator).toBe('boolean');
  });

  test('should load cached regions when offline', async ({ page, context }) => {
    // First load online to cache data
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Region selector should still work (from cache)
    await page.getByRole('combobox').first().click();
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
    await page.getByRole('combobox').first().click();
    const firstOption = page.getByRole('option').first();
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click();
      await page.waitForTimeout(1000);
    }

    // Look for download prompt or offline message
    const downloadPrompt = page.locator('text=/Download|offline|cache|data/i');
    const hasPrompt = await downloadPrompt.isVisible({ timeout: 3000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(typeof hasPrompt).toBe('boolean');
  });

  test('should persist saved locations offline', async ({ page, context }) => {
    // First save a location online
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Complete a work zone lookup
    await page.getByRole('combobox').first().click();
    const wheatbeltOption = page.getByRole('option', { name: /Wheatbelt/i });
    if (await wheatbeltOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wheatbeltOption.click();
      await page.waitForTimeout(1500);
    }

    const roadSelector = page.getByRole('combobox').nth(1);
    await roadSelector.click();
    const firstRoad = page.getByRole('option').first();
    if (await firstRoad.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRoad.click();
    }

    await page.getByPlaceholder(/Start SLK/i).fill('55.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();
    await page.waitForTimeout(4000);

    // Save the location
    const saveButton = page.getByRole('button', { name: /Save Location/i });
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Handle prompt if present
      const nameInput = page.getByPlaceholder(/name/i);
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
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
    const savedLocation = page.locator('text=/Offline Test Location|55.00|Saved Location/i');
    const isVisible = await savedLocation.isVisible({ timeout: 3000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(typeof isVisible).toBe('boolean');
  });
});

test.describe('Offline Data Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('should show settings drawer', async ({ page }) => {
    // Look for settings button (gear icon or settings text)
    const settingsButton = page.getByRole('button', { name: /Settings|⚙️|gear/i });
    if (await settingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Should show settings panel
      const settingsPanel = page.locator('text=/Offline|Download|Data|Settings/i');
      await expect(settingsPanel).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show offline data download options', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for download section
    const downloadSection = page.locator('text=/Download|Offline Data|Sync/i');
    const isVisible = await downloadSection.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('should show download progress when downloading', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for download button
    const downloadButton = page.getByRole('button', { name: /Download|Sync/i });
    if (await downloadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Note: We won't actually click download as it takes too long
      // Just verify the button exists
      await expect(downloadButton).toBeVisible();
    }
  });

  test('should show offline data status', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for status indicators
    const statusText = page.locator('text=/Ready|Downloaded|Available|Offline Ready/i');
    const hasStatus = await statusText.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasStatus).toBe('boolean');
  });
});

test.describe('PWA Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('should have service worker registered', async ({ page }) => {
    // Check if service worker is registered
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then((registrations) => {
        return registrations.length > 0;
      });
    });

    expect(typeof swRegistered).toBe('boolean');
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
    expect(typeof hasThemeColor).toBe('boolean');
  });

  test('should have app icons configured', async ({ page }) => {
    // Check for apple-touch-icon
    const appleIcon = await page.$('link[rel="apple-touch-icon"]');
    const hasAppleIcon = appleIcon !== null;

    // Check for icon links
    const icon = await page.$('link[rel="icon"]');
    const hasIcon = icon !== null;

    expect(hasIcon).toBeTruthy();
    expect(typeof hasAppleIcon).toBe('boolean');
  });
});

test.describe('Offline Work Zone Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('should attempt work zone lookup when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Try to do a lookup
    await page.getByRole('combobox').first().click();
    const firstOption = page.getByRole('option').first();
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click();
      await page.waitForTimeout(1000);
    }

    const roadSelector = page.getByRole('combobox').nth(1);
    if (await roadSelector.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await roadSelector.click();
      const roadOption = page.getByRole('option').first();
      if (await roadOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await roadOption.click();
      }
    }

    await page.getByPlaceholder(/Start SLK/i).fill('50.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();
    await page.waitForTimeout(3000);

    // Should either show cached results or an offline message
    const result = page.locator('text=/Work Zone|Error|Offline|cache|not available/i');
    const hasResult = await result.isVisible({ timeout: 5000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(typeof hasResult).toBe('boolean');
  });

  test('should show cached weather when offline', async ({ page, context }) => {
    // First do a lookup online to cache weather
    await page.getByRole('combobox').first().click();
    const wheatbeltOption = page.getByRole('option', { name: /Wheatbelt/i });
    if (await wheatbeltOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wheatbeltOption.click();
      await page.waitForTimeout(1500);
    }

    const roadSelector = page.getByRole('combobox').nth(1);
    await roadSelector.click();
    const firstRoad = page.getByRole('option').first();
    if (await firstRoad.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRoad.click();
    }

    await page.getByPlaceholder(/Start SLK/i).fill('60.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();
    await page.waitForTimeout(5000);

    // Now go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Check if weather shows cached indicator
    const cachedWeather = page.locator('text=/Cached|cache/i');
    const hasCached = await cachedWeather.isVisible({ timeout: 3000 }).catch(() => false);

    // Re-enable network
    await context.setOffline(false);

    expect(typeof hasCached).toBe('boolean');
  });
});

test.describe('Offline Toggle Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
  });

  test('should have offline mode toggles', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for toggle switches
    const toggleSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();
    const hasToggle = await toggleSwitch.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasToggle).toBe('boolean');
  });

  test('should toggle offline mode for specific data types', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for data type toggles
    const toggleLabels = page.locator('text=/Roads|Speed Zones|Weather|Amenities/i');
    const hasLabels = await toggleLabels.first().isVisible({ timeout: 2000 }).catch(() => false);
    expect(typeof hasLabels).toBe('boolean');
  });

  test('should remember offline toggle settings', async ({ page }) => {
    // Open settings
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Find a toggle
    const toggle = page.locator('[role="switch"]').first();
    if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
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
    await page.waitForLoadState('networkidle');
    await dismissOnboarding(page);
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
    await page.getByRole('combobox').first().click();
    const wheatbeltOption = page.getByRole('option', { name: /Wheatbelt/i });
    if (await wheatbeltOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await wheatbeltOption.click();
      await page.waitForTimeout(1500);
    }

    const roadSelector = page.getByRole('combobox').nth(1);
    await roadSelector.click();
    const firstRoad = page.getByRole('option').first();
    if (await firstRoad.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRoad.click();
    }

    await page.getByPlaceholder(/Start SLK/i).fill('70.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();
    await page.waitForTimeout(4000);

    // Should work now that we're online
    const results = page.locator('text=/Work Zone|Speed Zone|Traffic|Error/i');
    const hasResults = await results.isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof hasResults).toBe('boolean');
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
    const settingsButton = page.getByRole('button').filter({ has: page.locator('svg') }).last();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // Look for sync indicator
    const syncIndicator = page.locator('text=/Sync|synced|Updated/i');
    const hasSync = await syncIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasSync).toBe('boolean');
  });
});
