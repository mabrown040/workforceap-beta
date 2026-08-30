import { test, expect } from '@playwright/test';

/**
 * Homepage smoke test — verifies the public marketing homepage loads
 * and displays critical elements for both desktop and mobile.
 */
test.describe('Homepage smoke', () => {
  test('homepage loads with hero, journey, and footer', async ({ page }) => {
    await page.goto('/');

    // Hero heading visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Primary CTA link to /apply visible
    await expect(page.getByRole('link', { name: /apply/i }).first()).toBeVisible();

    // Canonical journey section visible. Program discovery is verified below
    // through the Programs navigation link rather than stale homepage copy.
    await expect(
      page.getByRole('heading', { name: /from apply to hired/i }).first(),
    ).toBeVisible();

    // Footer visible
    await expect(page.locator('footer')).toBeVisible();

    // Page title should be present and non-empty
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('homepage links to programs page', async ({ page }) => {
    await page.goto('/');
    const programsLink = page.getByRole('link', { name: /programs/i }).first();
    await expect(programsLink).toBeVisible();
  });
});
