import { test, expect } from '@playwright/test';
import { hasProdE2ECredentials, loginMemberPortal } from './auth-helpers';

/**
 * Run against production (or any deployed URL):
 *
 *   set PLAYWRIGHT_BASE_URL=https://workforceap.org
 *   set E2E_MEMBER_EMAIL=your@email.com
 *   set E2E_MEMBER_PASSWORD=your_password
 *   npx playwright test tests/e2e/prod-portal-smoke.spec.ts
 *
 * Do not commit credentials. Prefer CI secrets for automation.
 */
test.describe('Production portal smoke (env login)', () => {
  test.beforeEach(() => {
    test.skip(
      !hasProdE2ECredentials(),
      'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD to run prod login tests'
    );
  });

  test('login and member dashboard loads', async ({ page }) => {
    await loginMemberPortal(page);
    await expect(page.locator('h1').filter({ hasText: /welcome back/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('resources page loads after login', async ({ page }) => {
    await loginMemberPortal(page);
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: /career resource library/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('AI tools hub loads after login', async ({ page }) => {
    await loginMemberPortal(page);
    await page.goto('/dashboard/ai-tools');
    await expect(page.getByRole('heading', { name: /ai career toolkit/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
