import { test, expect } from '@playwright/test';

test.describe('Member signup', () => {
  test('signup page loads and has form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByLabel(/zip code/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('signup form shows validation errors for empty submit', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('#fullName-error')).toContainText(/name must be/i, { timeout: 3000 });
  });

  test('signup form has program interest dropdown', async ({ page }) => {
    await page.goto('/signup');
    const programSelect = page.getByLabel(/program of interest/i);
    await expect(programSelect).toBeVisible();
    await programSelect.selectOption({ index: 1 });
    await expect(programSelect).not.toHaveValue('');
  });

  test('signup page links to login', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.getByRole('link', { name: /sign in/i }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/^email$/i).fill('not-an-email');
    await page.locator('#password').fill('Password1');
    await page.getByLabel(/phone/i).fill('5125551234');
    await page.getByLabel(/zip code/i).fill('78701');
    await page.getByLabel(/program of interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 });
  });
});
