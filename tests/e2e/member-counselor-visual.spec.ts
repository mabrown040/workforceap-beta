import { test, expect } from '@playwright/test';
import { hasProdE2ECredentials, loginMemberPortal } from './auth-helpers';

test.describe('Member counselor page visual readiness', () => {
  test.skip(!hasProdE2ECredentials(), 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD');

  test('hero and CTA are not rendered in a disabled-looking state', async ({ page }) => {
    await loginMemberPortal(page);
    await page.goto('/dashboard/counselor', { waitUntil: 'domcontentloaded' });

    const heading = page.getByRole('heading', { name: /ai career counselor/i });
    await expect(heading).toBeVisible();

    const startSessionButton = page.getByRole('button', { name: /start session/i });
    await expect(startSessionButton).toBeVisible();
    await expect(startSessionButton).toBeEnabled();

    const headingOpacity = await heading.evaluate((el) => window.getComputedStyle(el).opacity);
    const buttonOpacity = await startSessionButton.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(Number(headingOpacity)).toBeGreaterThanOrEqual(0.95);
    expect(Number(buttonOpacity)).toBeGreaterThanOrEqual(0.95);
  });
});
