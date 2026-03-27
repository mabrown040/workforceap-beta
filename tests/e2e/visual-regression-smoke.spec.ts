import { test, expect } from '@playwright/test';

const adminStorageStatePath = process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE;

test.describe('Visual regression smoke (light mode)', () => {
  test('employers AI support section does not clip on mobile', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/employers');

    const heading = page.getByRole('heading', { name: /AI-powered career support/i });
    await expect(heading).toBeVisible();

    const copy = page.locator('.employers-ai-support-copy');
    await expect(copy).toBeVisible();

    const copyFitsViewport = await copy.evaluate((el) => {
      const node = el as HTMLElement;
      return node.scrollWidth <= node.clientWidth + 1;
    });
    expect(copyFitsViewport).toBeTruthy();
  });
});

if (adminStorageStatePath) {
  test.describe('Admin jobs mobile/tablet layout (authenticated)', () => {
    test.use({ storageState: adminStorageStatePath });

    test('stacks Applications + Actions under title/company on tablet', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 820, height: 1180 });
      await page.goto('/admin/jobs?filter=all');

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /^jobs$/i })).toBeVisible();
      await expect(page.locator('.admin-jobs-mobile-meta').first()).toBeVisible();
      await expect(page.locator('.admin-jobs-col-actions').first()).toBeHidden();
    });
  });
}
