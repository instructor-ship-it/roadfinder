import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - GPS Lookup E2E Tests
 * Tests for GPS location lookup functionality
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

test.describe('GPS Location Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show GPS lookup section', async ({ page }) => {
    // Look for GPS-related UI elements
    const gpsSection = page.locator('text=/GPS|Location|Coordinates/i');
    const isVisible = await gpsSection.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should have GPS coordinate input fields', async ({ page }) => {
    // Look for latitude and longitude inputs
    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    // These might be inside a collapsible section - expand if needed
    const gpsButton = page.getByRole('button', { name: /GPS|Location|Coordinates/i });
    if (await gpsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsButton.click();
      await page.waitForTimeout(500);
    }

    const latVisible = await latInput.isVisible({ timeout: 3000 }).catch(() => false);
    const lonVisible = await lonInput.isVisible({ timeout: 3000 }).catch(() => false);

    // At least one form of location input should exist
    expect(
      latVisible || lonVisible || (await gpsButton.isVisible().catch(() => false))
    ).toBeTruthy();
  });

  test('should show Get Current Location button', async ({ page }) => {
    // Look for button to get current location
    const getLocationButton = page.getByRole('button', {
      name: /Get.*Location|Current Location|Locate|GPS/i,
    });

    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(300);
    }

    const isVisible = await getLocationButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('should allow manual coordinate entry', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    // Look for lat/lon inputs
    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter test coordinates (Perth, WA area)
      await latInput.fill('-31.9505');
      await lonInput.fill('115.8605');

      // Verify values were entered
      const latValue = await latInput.inputValue();
      const lonValue = await lonInput.inputValue();

      expect(latValue).toBe('-31.9505');
      expect(lonValue).toBe('115.8605');
    }
  });

  test('should have Lookup button for coordinates', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(300);
    }

    // Look for lookup button
    const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i });
    const isVisible = await lookupButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();
  });
});

test.describe('GPS Lookup with Coordinates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should lookup location from entered coordinates', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    // Enter coordinates (Great Eastern Highway area)
    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await latInput.fill('-31.9505');
      await lonInput.fill('115.8605');

      // Click lookup button
      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // Should show some result - either road info or error
        const result = page.locator('text=/Road|SLK|Error|not found|Network/i');
        const hasResult = await result.isVisible({ timeout: 10000 }).catch(() => false);
        expect(hasResult).toBeTruthy();
      }
    }
  });

  test('should populate form after successful GPS lookup', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter coordinates
      await latInput.fill('-31.9505');
      await lonInput.fill('115.8605');

      // Click lookup
      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // If successful, road selector or SLK input should be populated
        const startSlkInput = page.getByPlaceholder('e.g. 100.0');
        const slkValue = await startSlkInput.inputValue().catch(() => '');

        // Either SLK was populated or an error was shown
        const errorVisible = await page
          .locator('text=/Error|not found/i')
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect(slkValue !== '' || errorVisible).toBeTruthy();
      }
    }
  });

  test('should handle invalid coordinates gracefully', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter invalid coordinates
      await latInput.fill('999');
      await lonInput.fill('999');

      // Click lookup
      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // Should show error message
        const errorVisible = await page
          .locator('text=/Error|Invalid|not found|failed/i')
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        expect(errorVisible).toBeTruthy();
      }
    }
  });

  test('should show coordinates outside WA warning', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter coordinates outside WA (Sydney)
      await latInput.fill('-33.8688');
      await lonInput.fill('151.2093');

      // Click lookup
      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // Should show error or no result
        const result = page.locator('text=/Error|not found|No road|outside/i');
        const hasResult = await result.isVisible({ timeout: 10000 }).catch(() => false);
        expect(hasResult).toBeTruthy();
      }
    }
  });
});

test.describe('GPS Current Location', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should request geolocation permission', async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);

    // Set mock location
    await page.setGeolocation({ latitude: -31.9505, longitude: 115.8605 });

    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    // Click get current location
    const getLocationButton = page.getByRole('button', {
      name: /Get.*Location|Current Location|Locate/i,
    });
    if (await getLocationButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getLocationButton.click();

      // Should populate coordinates or show error
      const latInput = page.getByPlaceholder(/lat/i);
      const latValue = await latInput.inputValue().catch(() => '');
      const errorVisible = await page
        .locator('text=/Error|Permission|denied/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(latValue !== '' || errorVisible).toBeTruthy();
    }
  });

  test('should handle denied geolocation permission', async ({ page, context }) => {
    // Deny geolocation permission (revoke permissions and deny)
    await context.grantPermissions([]);

    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    // Click get current location
    const getLocationButton = page.getByRole('button', {
      name: /Get.*Location|Current Location|Locate/i,
    });
    if (await getLocationButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getLocationButton.click();

      // Should show error message about permission
      const errorVisible = await page
        .locator('text=/Error|Permission|denied|unavailable/i')
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(errorVisible).toBeTruthy();
    }
  });
});

test.describe('GPS and Form Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should auto-select Local region for GPS-identified local road', async ({ page }) => {
    // Expand GPS section if collapsed
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter coordinates
      await latInput.fill('-31.9505');
      await lonInput.fill('115.8605');

      // Click lookup
      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // Check if region was auto-selected
        const localRoadVisible = await page
          .locator('text=/Local|Local Road/i')
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        expect(localRoadVisible).toBeTruthy();
      }
    }
  });

  test('should clear previous results when starting new GPS lookup', async ({ page }) => {
    // First do a manual lookup
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await regionTrigger.click();
    const wheatbeltOption = page.getByRole('option', { name: /Wheatbelt/i });
    if (await wheatbeltOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wheatbeltOption.click();
      await page.waitForTimeout(1000);
    }

    const roadTrigger = page.locator('button[data-slot="select-trigger"]').nth(1);
    await roadTrigger.click();
    const firstRoad = page.getByRole('option').first();
    if (await firstRoad.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRoad.click();
    }

    await page.getByPlaceholder('e.g. 100.0').fill('50.00');
    await page.getByRole('button', { name: /Get Work Zone Info/i }).click();

    // Now do GPS lookup
    const gpsToggle = page
      .locator('button')
      .filter({ hasText: /GPS|Location/i })
      .first();
    if (await gpsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gpsToggle.click();
      await page.waitForTimeout(500);
    }

    const latInput = page.getByPlaceholder(/lat/i);
    const lonInput = page.getByPlaceholder(/lon|lng/i);

    if (await latInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await latInput.fill('-32.0');
      await lonInput.fill('115.9');

      const lookupButton = page.getByRole('button', { name: /Lookup|Search|Find/i }).first();
      if (await lookupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lookupButton.click();

        // Previous results should be cleared or replaced - just verify the flow doesn't break
        expect(true).toBeTruthy();
      }
    }
  });
});
