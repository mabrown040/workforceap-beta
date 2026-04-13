import { test, expect } from '@playwright/test';

const adminStorageStatePath = process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE;

/**
 * Visual regression smoke tests — screenshot comparisons for key pages.
 *
 * Run:   npx playwright test visual-regression-smoke --update-snapshots  (first time / after intentional changes)
 * Then:  npx playwright test visual-regression-smoke                     (CI or regression checks)
 *
 * Snapshots stored in tests/e2e/visual-regression-smoke.spec.ts-snapshots/
 */

const MARKETING_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'employers', path: '/employers' },
  { name: 'partners', path: '/partners' },
  { name: 'programs', path: '/programs' },
  { name: 'apply', path: '/apply' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
];

const COLOR_SCHEMES = ['light', 'dark'] as const;

test.describe('Visual regression — marketing pages', () => {
  for (const page_ of MARKETING_PAGES) {
    for (const vp of VIEWPORTS) {
      for (const scheme of COLOR_SCHEMES) {
        test(`${page_.name} — ${vp.name} — ${scheme}`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme });
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(page_.path, { waitUntil: 'networkidle' });

          // Wait for any animations/transitions to settle
          await page.waitForTimeout(500);

          await expect(page).toHaveScreenshot(
            `${page_.name}-${vp.name}-${scheme}.png`,
            { fullPage: true, maxDiffPixelRatio: 0.01 }
          );
        });
      }
    }
  }
});

test.describe('Visual regression — functional checks', () => {
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

  test('apply page radio cards render correctly on mobile', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/apply');

    const radioCards = page.locator('.form-radio-card');
    const count = await radioCards.count();
    expect(count).toBeGreaterThan(0);

    // Each radio card should have at least 44px touch target
    for (let i = 0; i < count; i++) {
      const box = await radioCards.nth(i).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('apply page radio cards dark mode selected state', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/apply');

    // Click first Yes radio
    const firstYes = page.locator('.form-radio-card').first();
    await firstYes.click();

    // Should have selected class
    await expect(firstYes).toHaveClass(/selected/);

    await expect(page).toHaveScreenshot('apply-dark-selected.png', {
      maxDiffPixelRatio: 0.02,
    });
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
