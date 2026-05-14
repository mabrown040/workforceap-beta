import { test, expect } from '@playwright/test';

/**
 * Apply page smoke test — verifies the public application page loads
 * and renders the form area and sidebar.
 */
test.describe('Apply smoke', () => {
  test('apply page loads with hero and form area', async ({ page }) => {
    await page.goto('/apply');

    // Hero heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

    // Application form or eligibility client wrapper
    await expect(page.locator('.apply-main-form, form, [class*="eligibility"]').first()).toBeVisible();

    // Sidebar with progress steps
    await expect(page.locator('.apply-sidebar, aside').first()).toBeVisible();

    // Contact / help link or phone
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();
  });
});
