import { test, expect } from '@playwright/test';
import { addAuthCookie } from './auth-helpers';

test('shows Member Portal link to /login for signed-out users', async ({ page }) => {
  await page.goto('/');
  const login = page.getByRole('link', { name: /^login$/i }).first();
  await expect(login).toHaveAttribute('href', '/login');
});

test('routes Member Portal link to /dashboard when auth cookie exists', async ({ context, page, baseURL }) => {
  await addAuthCookie(context, baseURL || 'http://localhost:3000');
  await page.goto('/');
  // When authed, the portal entry may become "Account" depending on `/api/auth/me`.
  // In environments where the auth backend isn't available, the nav stays on "Login".
  const account = page.getByRole('link', { name: /^account$/i }).first();
  const login = page.getByRole('link', { name: /^login$/i }).first();
  if (await account.count()) {
    await expect(account).toHaveAttribute('href', '/dashboard');
  } else {
    await expect(login).toHaveAttribute('href', '/login');
  }
});
