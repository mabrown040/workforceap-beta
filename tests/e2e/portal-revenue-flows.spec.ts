import { test, expect } from '@playwright/test';

/**
 * Revenue workflow E2E tests.
 * - Unauthenticated users redirected to login from protected portals
 * - Authenticated users can access portal routes when authorized
 * Cookie-based auth uses sb-workforceap-auth-token (or project-specific Supabase cookie).
 */
function addAuthCookie(
  context: { addCookies: (cookies: object[]) => Promise<void> },
  baseURL: string
) {
  const appUrl = new URL(baseURL || 'http://localhost:3000');
  return context.addCookies([
    {
      name: 'sb-workforceap-auth-token',
      value: 'beta-session',
      domain: appUrl.hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('Portal access control', () => {
  test('unauthenticated user cannot access employer portal', async ({ page }) => {
    await page.goto('/employer');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirectTo');
  });

  test('unauthenticated user cannot access partner portal', async ({ page }) => {
    await page.goto('/partner');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user cannot access employer jobs page', async ({ page }) => {
    await page.goto('/employer/jobs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user cannot access employer new job page', async ({ page }) => {
    await page.goto('/employer/jobs/new');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Member portal assessments', () => {
  test('signed-in member can access assessments hub', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/dashboard/assessments');
    await expect(page).toHaveURL(/\/dashboard\/assessments/);
    await expect(page.getByRole('heading', { name: /skills assessment/i })).toBeVisible({ timeout: 10000 });
  });

  test('assessments page shows take assessment or completed state', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/dashboard/assessments');
    const takeBtn = page.getByRole('link', { name: /take assessment/i });
    const viewReadiness = page.getByRole('link', { name: /view career readiness/i });
    const whyWeAsk = page.getByText(/why we ask/i);
    await expect(whyWeAsk).toBeVisible({ timeout: 10000 });
    await expect(takeBtn.or(viewReadiness)).toBeVisible();
  });
});

test.describe('Jobs public flow', () => {
  test('public jobs listing is accessible without auth', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
