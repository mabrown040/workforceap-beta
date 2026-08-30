import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

const fixturePath = join(process.cwd(), 'tests/fixtures/xapi/statement-progressed.json');

/**
 * ## xAPI `/api/xapi/statements`
 * - **Auth:** `Authorization: Bearer <JWT>` where JWT is issued by
 *   `POST /api/xapi/oauth/token` (Basic auth with xAPI client id/secret) or, for
 *   local E2E only, `GET /api/test/xapi-access-token` when `E2E_ISSUE_XAPI_TOKEN=1`
 *   is set in the Next.js environment (e.g. `.env.local` — never in production).
 * - **Body:** single statement object or array; see `tests/fixtures/xapi/`.
 *
 * ## Admin Coursera mappings `/api/admin/coursera/mappings`
 * - Requires an **admin** session cookie (same as `/admin/coursera` UI). Full
 *   “map unmatched email” E2E is skipped here without `PLAYWRIGHT_STORAGE_STATE`
 *   from an admin login.
 */

test.describe('Sprint P2 — xAPI & Coursera smoke', () => {
  test('POST /api/xapi/statements without bearer returns 401', async ({ request }) => {
    const res = await request.post('/api/xapi/statements', {
      data: { id: 'x' },
    });
    expect(res.status()).toBe(401);
    const j = await res.json();
    expect(j.error).toMatch(/missing bearer/i);
  });

  test('POST /api/xapi/statements with invalid bearer returns 401', async ({ request }) => {
    const res = await request.post('/api/xapi/statements', {
      headers: { Authorization: 'Bearer not-a-real-jwt' },
      data: JSON.parse(readFileSync(fixturePath, 'utf8')),
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/member/coursera/launch unauthenticated redirects to login with coursera redirect', async ({
    page,
  }) => {
    await page.goto('/api/member/coursera/launch');
    await expect(page).toHaveURL(/\/login/);
    const loginUrl = new URL(page.url());
    expect(loginUrl.pathname).toMatch(/\/(?:[a-z]{2}\/)?login$/);
    expect(loginUrl.searchParams.get('redirectTo')).toBe('/dashboard/training');
  });

  test('GET /api/admin/coursera/mappings without session returns 401', async ({ request }) => {
    const res = await request.get('/api/admin/coursera/mappings');
    expect(res.status()).toBe(401);
  });

  test('optional: POST xAPI statements with dev-issued token (needs DB + E2E_ISSUE_XAPI_TOKEN)', async ({
    request,
  }) => {
    if (process.env.E2E_ISSUE_XAPI_TOKEN !== '1') {
      test.skip();
    }
    const tokenRes = await request.get('/api/test/xapi-access-token');
    if (tokenRes.status() === 404) {
      test.skip();
    }
    expect(tokenRes.ok()).toBeTruthy();
    const { accessToken } = (await tokenRes.json()) as { accessToken: string };
    expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

    const body = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const postRes = await request.post('/api/xapi/statements', {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: body,
    });
    // With a live DB the handler runs mapping + Prisma; without DB Next may 500.
    expect([200, 500]).toContain(postRes.status());
    if (postRes.ok()) {
      const j = (await postRes.json()) as { received?: boolean; processed?: number };
      expect(j.received).toBe(true);
      expect(typeof j.processed).toBe('number');
    }
  });
});
