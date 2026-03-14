import { test, expect } from '@playwright/test';

test.describe('Member signup', () => {
  test('signup page loads and has form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /create your member account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^email \*$/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByLabel(/zip/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('signup form shows validation errors for empty submit', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/name must be/i).or(page.getByText(/required/i))).toBeVisible({ timeout: 3000 });
  });

  test('signup form has program interest dropdown', async ({ page }) => {
    await page.goto('/signup');
    const programSelect = page.getByLabel(/program interest/i);
    await expect(programSelect).toBeVisible();
    await programSelect.selectOption({ index: 1 });
    await expect(programSelect).toHaveValue(/digital literacy/i);
  });

  test('signup page links to login', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.getByRole('link', { name: /log in/i }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByRole('textbox', { name: /^email \*$/i }).fill('not-an-email');
    await page.getByLabel(/password/i).fill('Password1');
    await page.getByLabel(/phone/i).fill('5125551234');
    await page.getByLabel(/zip/i).fill('78701');
    await page.getByLabel(/program interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 });
  });
});
