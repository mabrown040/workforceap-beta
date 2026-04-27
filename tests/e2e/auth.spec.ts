import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('login page loads and has form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('forgot password request shows non-enumerating success message', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('nonexistent-member@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
    await expect(
      page.getByText(/if an account exists for that email, you will receive reset instructions shortly\./i)
    ).toBeVisible();
  });

  test('reset password page handles missing token gracefully', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: /link invalid or expired/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /request a new reset link/i })).toBeVisible();
  });

  test('protected route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirectTo');
    await expect(page.url()).toContain('dashboard');
  });

  test('admin route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain('redirectTo');
    await expect(page.url()).toContain('admin');
  });

  test('resources route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/resources');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page links to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /get started/i });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup(\?|$)/);
  });

  test('login page links to forgot password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });
});
