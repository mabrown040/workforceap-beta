import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('login page loads and has form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
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
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL('/signup');
  });

  test('login page links to forgot password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });
});
