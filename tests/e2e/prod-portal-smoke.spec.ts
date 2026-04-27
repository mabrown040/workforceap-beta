import { test, expect } from '@playwright/test';
import { hasProdE2ECredentials, loginMemberPortal } from './auth-helpers';

/**
 * Run against production (or any deployed URL):
 *
 *   set PLAYWRIGHT_BASE_URL=https://www.workforceap.org
 *   set E2E_MEMBER_EMAIL=your@email.com
 *   set E2E_MEMBER_PASSWORD=your_password
 *   npx playwright test tests/e2e/prod-portal-smoke.spec.ts
 *
 * Or add a local-only `.env.e2e.local` (see `loadE2EEnvFile` in `playwright.config.ts`).
 * Do not commit credentials. Prefer CI secrets for automation.
 *
 * A single test + one login avoids auth rate limits from repeated sign-ins.
 * Admin / counselor / employer routes are out of scope unless you add role-specific env + specs.
 */
test.describe('Production portal smoke (env login)', () => {
  test.setTimeout(180_000);

  test('member dashboard, resources, AI tools, messages (single session)', async ({ page }) => {
    test.skip(
      !hasProdE2ECredentials(),
      'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD to run prod login tests'
    );

    await loginMemberPortal(page);
    await expect(page.locator('h1').filter({ hasText: /welcome back/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/resources', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /career resource library/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/dashboard/ai-tools', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /ai toolkit/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/dashboard/messages', { waitUntil: 'networkidle' });
    await expect(page.getByText('Program Team')).toHaveCount(0);
    await expect(page.getByText('Career Services')).toHaveCount(0);
  });
});
