/**
 * Cross-portal smoke: static routes load without staying on /login.
 * Requires: E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD
 * Legacy aliases still accepted: PLAYWRIGHT_MEMBER_EMAIL, PLAYWRIGHT_PORTAL_PASSWORD
 * Optional: PLAYWRIGHT_BASE_URL, PORTAL_AUDIT_SECTION=all|member|admin|employer|partner|counselor
 */
import { test, expect, type Page } from '@playwright/test';
import { STATIC_PATHS } from '../../scripts/lib/portal-audit-paths.mjs';
import { hasMemberPortalCredentials, loginMemberPortal } from './auth-helpers';
const sectionArg = (process.env.PORTAL_AUDIT_SECTION ?? 'all').toLowerCase();

type Section = keyof typeof STATIC_PATHS;

function sectionsToRun(): Section[] {
  const keys = Object.keys(STATIC_PATHS) as Section[];
  if (sectionArg === 'all') return keys;
  if (keys.includes(sectionArg as Section)) return [sectionArg as Section];
  return [];
}

async function goAllowingAbort(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('net::ERR_ABORTED')) throw error;
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

test.describe('cross-portal static routes', () => {
  test.skip(
    !hasMemberPortalCredentials(),
    'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD (legacy PLAYWRIGHT_* aliases still work)'
  );

  test('no section stuck on login', async ({ page, baseURL }) => {
    const sections = sectionsToRun();
    test.skip(sections.length === 0, 'Invalid PORTAL_AUDIT_SECTION');

    const origin = baseURL ?? 'http://localhost:3000';
    await loginMemberPortal(page);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });

    for (const section of sections) {
      for (const path of STATIC_PATHS[section]) {
        await goAllowingAbort(page, `${origin}${path}`);
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
      }
    }
  });
});
