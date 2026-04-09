import { test, expect } from '@playwright/test';

/**
 * Portal UI smoke (unauth).
 * Verifies key pages render and shared primitives exist without needing credentials.
 */
test.describe('Portal UI smoke (unauth)', () => {
  test('login page shows new labels and portal destination links', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/institutional id/i)).toBeVisible();
    await expect(page.getByLabel(/access key/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /recover key/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /request credentials/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /choose portal destination/i })).toBeVisible();
    await page.screenshot({ path: '/opt/cursor/artifacts/login_page.png', fullPage: true });
  });

  test('protected portal pages redirect to login (baseline guardrail)', async ({ page }) => {
    const protectedPaths = ['/dashboard/messages', '/partner/messages', '/employer/messages', '/counselor/messages', '/admin/messages'];
    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
    // Capture one representative redirect state.
    await page.screenshot({ path: '/opt/cursor/artifacts/protected_route_redirects_to_login.png', fullPage: true });
  });
});

