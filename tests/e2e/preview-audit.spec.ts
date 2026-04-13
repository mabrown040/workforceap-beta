import { test } from '@playwright/test';

import { loginMemberPortal } from './auth-helpers';

test.describe('Preview audit (artifacts)', () => {
  test('capture core member portal screenshots', async ({ page }) => {
    // Marketing home (also used to bootstrap Vercel share cookie via auth-helpers).
    await page.goto('/');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: '/opt/cursor/artifacts/preview_audit_home.png',
      fullPage: true,
    });

    await page.goto('/login');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: '/opt/cursor/artifacts/preview_audit_login.png',
      fullPage: true,
    });

    await loginMemberPortal(page);
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: '/opt/cursor/artifacts/preview_audit_member_dashboard.png',
      fullPage: true,
    });

    await page.goto('/dashboard/messages');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: '/opt/cursor/artifacts/preview_audit_member_messages.png',
      fullPage: true,
    });
  });
});

