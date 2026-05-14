/**
 * Highest-trust path: member clicks tracked Coursera launch from My Training and lands on a real Coursera content URL.
 *
 * @see components/portal/TrackedCourseraLaunchLink.tsx
 * @see app/api/member/coursera/launch/route.ts
 *
 * Credentials: same as other member portal E2Es (PLAYWRIGHT_MEMBER_EMAIL + PLAYWRIGHT_PORTAL_PASSWORD).
 * The account must have an active Coursera-backed program so "Open Coursera" is shown.
 */
import { test, expect, type Page } from '@playwright/test';

const PASSWORD = process.env.PLAYWRIGHT_PORTAL_PASSWORD ?? '';
const EMAIL = process.env.PLAYWRIGHT_MEMBER_EMAIL ?? '';

async function loginMemberInstitutional(page: Page, baseURL: string): Promise<void> {
  await page.goto(`${baseURL}/login?redirectTo=${encodeURIComponent('/dashboard/training')}`);
  await page.getByLabel(/institutional id/i).fill(EMAIL);
  await page.getByLabel(/access key/i).fill(PASSWORD);
  await page.getByRole('button', { name: /authenticate access/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

function hasNextActionHeader(headers: Record<string, string>): boolean {
  const keys = Object.keys(headers);
  return keys.some((k) => k.toLowerCase() === 'next-action');
}

test.describe('Coursera launch (My Training)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_PORTAL_PASSWORD');

  test('Open Coursera: redirect API + Coursera document 200 + analytics server action', async ({
    page,
    baseURL,
  }) => {
    const origin = baseURL ?? 'http://localhost:3000';
    await loginMemberInstitutional(page, origin);
    await page.goto(`${origin}/dashboard/training`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    const openCourseraLoc = page.getByRole('link', { name: /^Open Coursera$/i });
    if ((await openCourseraLoc.count()) === 0) {
      test.skip(true, 'No Open Coursera link — use a member enrolled in a Coursera program');
    }
    const openCoursera = openCourseraLoc.first();
    await expect(openCoursera).toBeVisible({ timeout: 15_000 });
    const href = await openCoursera.getAttribute('href');
    expect(href).toMatch(/\/api\/member\/coursera\/launch/);

    const ctx = page.context();
    // Register context-wide listeners before click so we do not miss the popup's first navigation.
    const launchRedirectPromise = ctx.waitForEvent('response', (res) => {
      const u = res.url();
      if (!u.includes('/api/member/coursera/launch')) return false;
      return [302, 303, 307].includes(res.status());
    });
    const courseraDocPromise = ctx.waitForEvent('response', (res) => {
      if (res.request().resourceType() !== 'document') return false;
      const u = res.url();
      if (!/coursera\.org/i.test(u)) return false;
      if (u.includes('/api/member/coursera/launch')) return false;
      return res.ok();
    });

    // New tab + Next.js server action from TrackedCourseraLaunchLink (logCourseraLaunchFromPortal).
    const popupPromise = page.waitForEvent('popup');
    const analyticsPostPromise = page.waitForResponse(
      (res) => {
        if (res.request().method() !== 'POST') return false;
        if (!res.url().startsWith(origin)) return false;
        try {
          if (!new URL(res.url()).pathname.includes('/dashboard/training')) return false;
        } catch {
          return false;
        }
        if (!hasNextActionHeader(res.request().headers())) return false;
        return res.ok();
      },
      { timeout: 20_000 }
    );

    await openCoursera.click();

    const [popup, launchRedirect, courseraDoc, analyticsRes] = await Promise.all([
      popupPromise,
      launchRedirectPromise,
      courseraDocPromise,
      analyticsPostPromise,
    ]);

    expect(analyticsRes.status()).toBe(200);
    expect([302, 303, 307]).toContain(launchRedirect.status());
    expect(courseraDoc.status()).toBe(200);

    await popup.waitForURL(/coursera\.org/i, { timeout: 45_000 });
    const finalUrl = popup.url();
    expect(finalUrl).toMatch(/coursera\.org\/(learn|professional-certificates|specializations)\//);

    await popup.close();
  });
});
