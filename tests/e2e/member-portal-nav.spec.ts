import { test, expect } from '@playwright/test';
import { addAuthCookie } from './auth-helpers';

test('shows Member Portal link to /login for signed-out users', async ({ page }) => {
  await page.goto('/');
  const memberPortal = page.getByRole('link', { name: 'Member Portal' }).first();
  await expect(memberPortal).toHaveAttribute('href', '/login');
});

test('routes Member Portal link to /dashboard when auth cookie exists', async ({ context, page, baseURL }) => {
  await addAuthCookie(context, baseURL || 'http://localhost:3000');
  await page.goto('/');
  const memberPortal = page.getByRole('link', { name: 'Member Portal' }).first();
  await expect(memberPortal).toHaveAttribute('href', '/dashboard');
});
