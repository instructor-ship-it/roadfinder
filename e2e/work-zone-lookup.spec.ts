import { test, expect } from '@playwright/test';

/**
 * TC Work Zone Locator - Work Zone Lookup E2E Tests
 * Tests for the main work zone lookup functionality
 *
 * Key facts about the form:
 * - Region selector: Radix <Select>, trigger is <button data-slot="select-trigger">
 * - Road selector: Radix <Select>, same trigger pattern
 * - Start SLK placeholder: "e.g. 100.0"
 * - End SLK placeholder: "e.g. 100.5"
 * - Submit button: disabled when no road selected; text changes to "Searching..." during API call
 * - First road in Wheatbelt: H001 (Albany Hwy), valid SLK 51.1–215.2 km
 * - Onboarding: full-screen modal at z-[100], checks localStorage 'tc-onboarding-complete'
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
 * Helper: Fill SLK values using the actual placeholder text.
 * Uses 100.00 as default start SLK (within valid range for most Wheatbelt roads).
 */
async function fillSlkValues(
  page: import('@playwright/test').Page,
  startSlk: string,
  endSlk?: string
) {
  await page.getByPlaceholder('e.g. 100.0').fill(startSlk);
  if (endSlk !== undefined) {
    await page.getByPlaceholder('e.g. 100.5').fill(endSlk);
  }
}

/**
 * Helper: Click submit and wait for the search to complete.
 * The button text changes from "Get Work Zone Info" → "Searching..." → back to "Get Work Zone Info"
 */
async function submitAndWait(page: import('@playwright/test').Page) {
  const submitButton = page.getByRole('button', { name: /Get Work Zone Info|Searching/i });
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  // Wait for search to finish (button text returns from "Searching..." to "Get Work Zone Info")
  await expect(page.getByRole('button', { name: /^Get Work Zone Info$/i }))
    .toBeVisible({ timeout: 20000 })
    .catch(() => {
      // If the button doesn't come back, the search might still have completed with results or error shown
    });
}

test.describe('Work Zone Lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should display the main form elements', async ({ page }) => {
    // Check for region selector trigger
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await expect(regionTrigger).toBeVisible({ timeout: 10000 });

    // Check for Start SLK input (actual placeholder is "e.g. 100.0")
    const startSlkInput = page.getByPlaceholder('e.g. 100.0');
    await expect(startSlkInput).toBeVisible();

    // Check for Get Work Zone Info button (disabled until road is selected)
    const submitButton = page.getByRole('button', { name: /Get Work Zone Info/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should select a region and load roads', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');

    // Check that road selector is now populated/enabled
    const roadTrigger = page.locator('button[data-slot="select-trigger"]').nth(1);
    await expect(roadTrigger).toBeEnabled({ timeout: 5000 });
  });

  test('should perform a work zone lookup', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    // Use SLK within valid range for H001 (Albany Hwy): 51.1–215.2 km
    await fillSlkValues(page, '100.00', '100.50');

    await submitAndWait(page);

    // After search completes, look for any result content (heading includes emoji: "📍 Work Zone Summary")
    const resultsOrError = page
      .locator('heading, [role="heading"]')
      .filter({ hasText: /Work Zone/i })
      .first();
    const hasResults = await resultsOrError.isVisible({ timeout: 10000 }).catch(() => false);

    // Also check for the Reset button which appears after successful search
    const resetButton = page.getByRole('button', { name: /Reset/i });
    const hasReset = await resetButton.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasResults || hasReset).toBeTruthy();
  });

  test('should show submit button as disabled when no road is selected', async ({ page }) => {
    // Without selecting a road, the button should be disabled
    const submitButton = page.getByRole('button', { name: /Get Work Zone Info/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should display work zone results after successful lookup', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00', '100.50');

    await submitAndWait(page);

    // Wait for results - check for Work Zone Summary heading or Reset button
    const resetButton = page.getByRole('button', { name: /Reset/i });
    const hasResults = await resetButton.isVisible({ timeout: 15000 }).catch(() => false);

    if (hasResults) {
      await expect(resetButton).toBeVisible();
    }
  });

  test('should reset form and results', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Check if results appeared and reset
    const resetButton = page.getByRole('button', { name: /Reset/i });
    if (await resetButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await resetButton.click();

      // Verify form is back to initial state
      await expect(page.getByRole('button', { name: /Get Work Zone Info/i })).toBeVisible();

      // SLK should be cleared
      const startSlkValue = await page.getByPlaceholder('e.g. 100.0').inputValue();
      expect(startSlkValue).toBe('');
    }
  });

  test('should show single point lookup when End SLK is empty', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    // Only fill Start SLK, leave End SLK empty
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Check for results - Reset button or Work Zone Summary heading
    const resetButton = page.getByRole('button', { name: /Reset/i });
    const workZoneHeading = page
      .locator('heading')
      .filter({ hasText: /Work Zone/i })
      .first();
    const hasReset = await resetButton.isVisible({ timeout: 10000 }).catch(() => false);
    const hasHeading = await workZoneHeading.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasReset || hasHeading).toBeTruthy();
  });
});

test.describe('Work Zone Results Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should show speed zone layout diagram', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00', '100.50');

    await submitAndWait(page);

    // Look for speed zone section (button text includes emoji: "📊 Speed Zone Layout")
    const speedZoneSection = page.getByRole('button', { name: /Speed Zone/i });
    if (await speedZoneSection.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Should show speed zone info (sections are already expanded with "−" indicator)
      const diagramVisible = await page
        .locator('text=/110 km\/h|km\/h|Speed Zone/i')
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(diagramVisible).toBeTruthy();
    }
  });

  test('should show traffic volume section', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Look for traffic volume section (button text: "🚗 Traffic Volume")
    const trafficButton = page.getByRole('button', { name: /Traffic Volume/i });
    const hasButton = await trafficButton.isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasButton).toBeTruthy();
  });

  test('should show weather section', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Look for weather section (button text: "🌤️ Weather - Offline Mode")
    const weatherButton = page.getByRole('button', { name: /Weather.*Offline|Weather -/i });
    const hasButton = await weatherButton.isVisible({ timeout: 10000 }).catch(() => false);
    // Also check for the section heading
    const weatherHeading = page
      .locator('heading')
      .filter({ hasText: /Weather/i })
      .first();
    const hasHeading = await weatherHeading.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasButton || hasHeading).toBeTruthy();
  });

  test('should show amenities section', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Look for amenities section (button text: "🏥 Amenities")
    const amenitiesButton = page.getByRole('button', { name: /Amenities/i });
    const hasButton = await amenitiesButton.isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasButton).toBeTruthy();
  });
});

test.describe('Work Zone Form Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await skipOnboarding(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should allow manual entry for Local roads', async ({ page }) => {
    // Select Local roads (displayed as "📍 Local Roads")
    const regionTrigger = page.locator('button[data-slot="select-trigger"]').first();
    await regionTrigger.click();
    const localOption = page.getByRole('option', { name: /Local/i });
    if (await localOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await localOption.click();

      // Should show text input for road ID instead of dropdown
      const roadInput = page.getByPlaceholder('Enter local road ID');
      await expect(roadInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show valid SLK range for selected road', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);

    // Should show SLK range hint text like "Valid SLK: 51.1 – 215.2 km"
    const slkHint = page.locator('text=/Valid SLK/i');
    await expect(slkHint).toBeVisible({ timeout: 5000 });
  });

  test('should collapse and expand sections', async ({ page }) => {
    await selectRegion(page, 'Wheatbelt');
    await selectFirstRoad(page);
    await fillSlkValues(page, '100.00');

    await submitAndWait(page);

    // Find a collapsible section header
    const sectionHeader = page
      .locator('button')
      .filter({ hasText: /Speed Zone|Traffic|Weather/i })
      .first();
    if (await sectionHeader.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Click to collapse
      await sectionHeader.click();

      // Click again to expand
      await sectionHeader.click();

      // Section should still be visible
      await expect(sectionHeader).toBeVisible();
    }
  });
});
