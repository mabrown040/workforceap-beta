import { test, expect } from '@playwright/test';

/**
 * Signed-in tests require valid Supabase auth. The cookie approach works when
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set and the
 * cookie contains a valid session. For CI without test auth, signed-in tests may fail.
 */
function addAuthCookie(context: { addCookies: (cookies: object[]) => Promise<void> }, baseURL: string) {
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

test.describe('Member Portal MVP', () => {
  test('unauthenticated user cannot access dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirectTo');
  });

  test('unauthenticated user cannot access resources', async ({ page }) => {
    await page.goto('/resources');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user cannot access ai-tools', async ({ page }) => {
    await page.goto('/ai-tools');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user cannot access career-brief', async ({ page }) => {
    await page.goto('/career-brief');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signed-in member sees dashboard Start Here card', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /start here/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/your next steps to get job-ready/i)).toBeVisible();
  });

  test('signed-in member sees Resources page and filters', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/resources');
    await expect(page.getByRole('heading', { name: /career resources/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/filter by category/i)).toBeVisible();
    await expect(page.getByLabel(/filter by career stage/i)).toBeVisible();
  });

  test('signed-in member sees AI Tools route', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/ai-tools');
    await expect(page.getByRole('heading', { name: /ai career toolkit/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/resume rewriter/i)).toBeVisible();
  });

  test('signed-in member sees benefit cards and request CTA', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/dashboard');
    await expect(page.getByText(/linkedin premium/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/coursera/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /request access/i }).first()).toBeVisible();
  });

  test('signed-in member sees Career Brief with first post', async ({ context, page, baseURL }) => {
    await addAuthCookie(context, baseURL || 'http://localhost:3000');
    await page.goto('/career-brief');
    await expect(page.getByRole('heading', { name: /weekly career brief/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/2026-03-14/)).toBeVisible();
  });
});
