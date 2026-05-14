import { test, expect } from '@playwright/test';

/**
 * Login page smoke test — verifies the login page renders correctly
 * for unauthenticated users without needing credentials.
 */
test.describe('Login smoke', () => {
  test('login page loads with form fields', async ({ page }) => {
    await page.goto('/login');

    // Main heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

    // Institutional ID / email label
    const idLabel = page.getByLabel(/institutional id|email/i).first();
    await expect(idLabel).toBeVisible();

    // Password field
    await expect(page.locator('#password, input[type="password"]').first()).toBeVisible();

    // Sign-in button
    await expect(page.getByRole('button', { name: /sign in|authenticate/i })).toBeVisible();

    // Link to signup
    await expect(page.getByRole('link', { name: /get started|sign up|create account/i }).first()).toBeVisible();
  });

  test('login page links to password recovery', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /forgot password|recover/i }).first()).toBeVisible();
  });
});
