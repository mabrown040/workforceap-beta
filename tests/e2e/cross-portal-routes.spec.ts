/**
 * Cross-portal smoke: static routes load without staying on /login.
 * Requires: PLAYWRIGHT_MEMBER_EMAIL, PLAYWRIGHT_PORTAL_PASSWORD
 * Optional: PLAYWRIGHT_BASE_URL, PORTAL_AUDIT_SECTION=all|member|admin|employer|partner|counselor
 */
import { test, expect } from '@playwright/test';
import { STATIC_PATHS, SECTION_LOGIN_REDIRECT } from '../../scripts/lib/portal-audit-paths.mjs';

const EMAIL = process.env.PLAYWRIGHT_MEMBER_EMAIL ?? '';
const PASSWORD = process.env.PLAYWRIGHT_PORTAL_PASSWORD ?? '';
const sectionArg = (process.env.PORTAL_AUDIT_SECTION ?? 'all').toLowerCase();

type Section = keyof typeof STATIC_PATHS;

function sectionsToRun(): Section[] {
  const keys = Object.keys(STATIC_PATHS) as Section[];
  if (sectionArg === 'all') return keys;
  if (keys.includes(sectionArg as Section)) return [sectionArg as Section];
  return [];
}

test.describe('cross-portal static routes', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_PORTAL_PASSWORD');

  test('no section stuck on login', async ({ page, baseURL }) => {
    const sections = sectionsToRun();
    test.skip(sections.length === 0, 'Invalid PORTAL_AUDIT_SECTION');

    const origin = baseURL ?? 'http://localhost:3000';
    const first = sections[0];
    await page.goto(`${origin}/login?redirectTo=${encodeURIComponent(SECTION_LOGIN_REDIRECT[first])}`);
    await page.getByLabel(/institutional id/i).fill(EMAIL);
    await page.getByLabel(/access key/i).fill(PASSWORD);
    await page.getByRole('button', { name: /authenticate access/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });

    for (const section of sections) {
      for (const path of STATIC_PATHS[section]) {
        await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
      }
    }
  });
});
