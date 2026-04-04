import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Static marketing routes avoid DB-heavy homepage and auth flows during local/CI smoke. */
test.describe('axe accessibility smoke', () => {
  test.describe.configure({ mode: 'serial' });

  async function assertNoSeriousViolations(page: Page, path: string) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    // Smoke scope: exclude color-contrast (many marketing pages need token passes); catch structure/name/keyboard issues.
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
  }

  test('terms has no serious axe violations', async ({ page }) => {
    await assertNoSeriousViolations(page, '/terms');
  });

  test('privacy has no serious axe violations', async ({ page }) => {
    await assertNoSeriousViolations(page, '/privacy');
  });
});
