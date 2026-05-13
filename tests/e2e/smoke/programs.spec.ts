import { test, expect } from '@playwright/test';

/**
 * Programs page smoke test — verifies the public programs catalog page
 * loads and shows program content.
 */
test.describe('Programs smoke', () => {
  test('programs page loads with catalog heading and cards', async ({ page }) => {
    await page.goto('/programs');

    // Page heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

    // Program catalog anchor present
    await expect(page.locator('#program-catalog')).toBeVisible();

    // At least one link to an individual program
    const programLinks = page.locator('a[href^="/programs/"]');
    await expect(programLinks.first()).toBeVisible();

    // CTA to apply
    await expect(page.getByRole('link', { name: /apply/i }).first()).toBeVisible();
  });
});
