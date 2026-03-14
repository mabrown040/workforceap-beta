import { test, expect } from '@playwright/test';

test('shows Member Portal link to /login for signed-out users', async ({ page }) => {
  await page.goto('/');
  const memberPortal = page.getByRole('link', { name: 'Member Portal' }).first();
  await expect(memberPortal).toHaveAttribute('href', '/login');
});

test('routes Member Portal link to /dashboard when auth cookie exists', async ({ context, page, baseURL }) => {
  const appUrl = new URL(baseURL || 'http://localhost:3000');

  await context.addCookies([
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

  await page.goto('/');
  const memberPortal = page.getByRole('link', { name: 'Member Portal' }).first();
  await expect(memberPortal).toHaveAttribute('href', '/dashboard');
});
