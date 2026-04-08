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

function getVercelShareToken(): string | null {
  const shareUrl = process.env.PLAYWRIGHT_VERCEL_SHARE_URL?.trim();
  if (!shareUrl) return null;
  try {
    const u = new URL(shareUrl);
    return u.searchParams.get('_vercel_share');
  } catch {
    return null;
  }
}

async function bootstrapVercelShareCookie(page: Page): Promise<void> {
  const shareUrl = process.env.PLAYWRIGHT_VERCEL_SHARE_URL?.trim();
  if (!shareUrl) return;
  // Visiting the share URL sets an auth cookie for protected previews.
  await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
  // Then navigate within the same origin so subsequent relative page.goto('/login') stays on the app.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
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
  await bootstrapVercelShareCookie(page);
  const shareToken = getVercelShareToken();
  const loginPath = shareToken ? `/login?_vercel_share=${encodeURIComponent(shareToken)}` : '/login';
  await page.goto(loginPath);
  await page.getByLabel(/institutional id/i).fill(email);
  await page.getByLabel(/access key/i).fill(password);
  await page.getByRole('button', { name: /authenticate access/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
}
