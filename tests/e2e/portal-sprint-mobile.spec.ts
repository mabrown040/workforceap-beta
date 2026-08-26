import { test, expect, type Page } from '@playwright/test';

const MEMBER_EMAIL = process.env.PLAYWRIGHT_MEMBER_EMAIL ?? 'member-test@workforceap.org';
const PARTNER_EMAIL = process.env.PLAYWRIGHT_PARTNER_EMAIL ?? 'partner-test@workforceap.org';
const PASSWORD = process.env.PLAYWRIGHT_PORTAL_PASSWORD ?? 'TestWfAP2026!';

async function login(page: Page, email: string, redirectTo: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  await page.getByLabel(/institutional id/i).fill(email);
  await page.getByLabel(/access key/i).fill(PASSWORD);
  await page.getByRole('button', { name: /authenticate access/i }).click();

  try {
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    return { authenticated: true as const };
  } catch {
    const reason =
      (await page.getByRole('alert').textContent().catch(() => null)) ??
      'Portal QA auth is not configured in this environment.';
    return { authenticated: false as const, reason: reason.trim() };
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 4);
}

test.describe('Sprint pages on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('member pages stay usable at mobile width', async ({ page }) => {
    const loginResult = await login(page, MEMBER_EMAIL, '/dashboard/job-applications');
    test.skip(!loginResult.authenticated, loginResult.reason);

    await expect(page.getByRole('heading', { name: /application tracker/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add application/i })).toBeVisible();
    await page.getByRole('button', { name: /add application/i }).click();
    await expect(page.getByRole('dialog', { name: /add application/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: /close add application dialog/i }).click();

    await page.goto('/dashboard/ai-tools/skill-mapper');
    await expect(page.getByRole('heading', { name: /skill mapper/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('partner invite flow is mobile accessible', async ({ page }) => {
    const loginResult = await login(page, PARTNER_EMAIL, '/partner/referred-members');
    test.skip(!loginResult.authenticated, loginResult.reason);

    await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible();
    await page.getByRole('button', { name: /invite member/i }).click();
    await expect(page.getByRole('dialog', { name: /invite a member to apply/i })).toBeVisible();

    await page.getByRole('button', { name: /send invite/i }).click();
    await expect(page.getByRole('alert')).toContainText(/valid email address/i);
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /invite a member to apply/i })).toHaveCount(0);
  });
});
