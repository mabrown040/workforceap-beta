import type { BrowserContext, Page } from '@playwright/test';

/**
 * Cookie-based session hint for local/staging E2E. Requires a valid Supabase session
 * when NEXT_PUBLIC_SUPABASE_* are set; otherwise tests may redirect to login.
 */
export function addAuthCookie(
  context: BrowserContext,
  baseURL: string
): Promise<void> {
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

/** Real login against deployed site (prod/staging). Never commit values — set in shell or CI secrets. */
export function hasProdE2ECredentials(): boolean {
  const email = process.env.E2E_MEMBER_EMAIL?.trim();
  const password = process.env.E2E_MEMBER_PASSWORD;
  return Boolean(email && password);
}

/**
 * UI login (matches `LoginForm`: Institutional ID + Access Key + AUTHENTICATE ACCESS).
 * Requires `E2E_MEMBER_EMAIL` and `E2E_MEMBER_PASSWORD`.
 */
export async function loginMemberPortal(page: Page): Promise<void> {
  const email = process.env.E2E_MEMBER_EMAIL?.trim();
  const password = process.env.E2E_MEMBER_PASSWORD;
  if (!email || !password) {
    throw new Error('Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD');
  }
  await page.goto('/login');
  await page.getByLabel(/institutional id/i).fill(email);
  await page.getByLabel(/access key/i).fill(password);
  await page.getByRole('button', { name: /authenticate access/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
}
