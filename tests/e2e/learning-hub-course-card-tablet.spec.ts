import { expect, test } from '@playwright/test';
import { hasProdE2ECredentials, loginMemberPortal } from './auth-helpers';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use(executablePath ? { launchOptions: { executablePath } } : {});

/**
 * Regression for the Learning Hub tablet collapse: with
 * `grid-template-columns: minmax(0, 1fr) auto` the actions track took its
 * single-line max-content width and the title column computed to 0px at
 * 820-834px, so course titles rendered one character per line (up to 52
 * lines per card). The fix floors the title column and caps the actions
 * column in `css/portal-main-extracted.css`.
 */
test.describe('Learning Hub course cards on tablet', () => {
  test.beforeEach(() => {
    test.skip(!hasProdE2ECredentials(), 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD');
  });

  for (const width of [820, 834, 1024]) {
    test(`course titles keep a real column and wrap on words at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1180 });
      await loginMemberPortal(page);
      await page.goto('/dashboard/learning', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

      const cards = page.locator('.training-course-card');
      const count = await cards.count();
      test.skip(count === 0, 'Member has no Learning Hub course cards to measure');

      const metrics = await page.evaluate(() => {
        const toNumber = (value: string) => Number.parseFloat(value) || 0;
        return Array.from(document.querySelectorAll('.training-course-card')).map((card) => {
          const main = card.querySelector('.training-course-card__main');
          const title = card.querySelector('.training-course-card__title');
          const titleStyle = title instanceof HTMLElement ? getComputedStyle(title) : null;
          const lineHeight = titleStyle
            ? toNumber(titleStyle.lineHeight) || toNumber(titleStyle.fontSize) * 1.4
            : 0;
          return {
            mainWidth: main instanceof HTMLElement ? main.getBoundingClientRect().width : 0,
            titleHeight: title instanceof HTMLElement ? title.getBoundingClientRect().height : 0,
            lineHeight,
          };
        });
      });

      for (const [index, card] of metrics.entries()) {
        expect(card.mainWidth, `card ${index} title column width`).toBeGreaterThan(200);
        // At most two wrapped lines; the bug produced 8-52 lines per title.
        expect(card.titleHeight, `card ${index} title height`).toBeLessThanOrEqual(card.lineHeight * 2 + 1);
      }
    });
  }
});
