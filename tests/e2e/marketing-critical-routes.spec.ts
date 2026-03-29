import { expect, test } from '@playwright/test';

const criticalRoutes = [
  { path: '/', heading: /workforce|career|future|job/i },
  { path: '/programs', heading: /program/i },
  { path: '/apply', heading: /apply|get started|eligibility/i },
  { path: '/login', heading: /log in|sign in/i },
  { path: '/faq', heading: /faq|frequently asked/i },
  { path: '/contact', heading: /contact/i },
  { path: '/jobs', heading: /jobs|open roles|opportunities/i },
];

test.describe('Marketing critical routes', () => {
  for (const route of criticalRoutes) {
    test(`${route.path} renders main content`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toContainText(route.heading);

      await page.screenshot({
        fullPage: true,
        path: `test-results/critical-routes/${route.path === '/' ? 'home' : route.path.slice(1).replaceAll('/', '-')}.png`,
      });
    });
  }
});
