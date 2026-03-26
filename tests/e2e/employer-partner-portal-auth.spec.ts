import { test, expect } from '@playwright/test';
import { addAuthCookie } from './auth-helpers';

/**
 * Optional signed-in flows for employer/partner portals.
 * Set PLAYWRIGHT_STORAGE_STATE to a path from `npx playwright codegen` or
 * `await context.storageState({ path: 'auth.json' })` after logging in as an
 * employer or partner user. Without it, only the cookie-stub test runs.
 */
const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE;

if (storageStatePath) {
  test.describe('Employer portal (authenticated)', () => {
    test.use({ storageState: storageStatePath });

    test('employer messages page loads', async ({ page }) => {
      await page.goto('/employer/messages');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /^messages$/i })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Partner portal (authenticated)', () => {
    test.use({ storageState: storageStatePath });

    test('partner messages page loads', async ({ page }) => {
      await page.goto('/partner/messages');
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /^messages$/i })).toBeVisible({ timeout: 15000 });
    });
  });
}

test.describe('Portal auth without storage state', () => {
  test('stub cookie alone redirects employer and partner messages to login', async ({
    context,
    page,
    baseURL,
  }) => {
    if (storageStatePath) {
      test.skip();
    }
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/employer/messages');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/partner/messages');
    await expect(page).toHaveURL(/\/login/);
  });
});
