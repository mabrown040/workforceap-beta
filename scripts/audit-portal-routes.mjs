/**
 * Cross-portal route audit: visits every static path for selected section(s) after one login.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://workforceap-beta.vercel.app \
 *   E2E_MEMBER_EMAIL=... E2E_MEMBER_PASSWORD=... \
 *   node scripts/audit-portal-routes.mjs
 *
 * Optional:
 *   PORTAL_AUDIT_SECTION=all|member|admin|employer|partner|counselor   (default: all)
 *
 * Writes: docs/portal-audit-results.json
 */
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  STATIC_PATHS,
  DYNAMIC_PATHS,
  SECTION_LOGIN_REDIRECT,
} from './lib/portal-audit-paths.mjs';
import { resolveMemberPortalCredentials } from './lib/portal-audit-auth.mjs';
import { classifyPortalAuditRow } from './lib/portal-audit-classify.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const { email, password, source: credentialSource } = resolveMemberPortalCredentials(process.env);
const sectionArg = (process.env.PORTAL_AUDIT_SECTION ?? 'all').toLowerCase();

function sectionsToRun() {
  const keys = Object.keys(STATIC_PATHS);
  if (sectionArg === 'all') return keys;
  if (keys.includes(sectionArg)) return [sectionArg];
  console.error(`PORTAL_AUDIT_SECTION must be one of: all, ${keys.join(', ')}`);
  process.exit(1);
}

async function login(page, redirectPath) {
  await page.goto(`${baseURL}/login?redirectTo=${encodeURIComponent(redirectPath)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('#email').click();
  await page.locator('#email').fill(email);
  await page.locator('#password').click();
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login([?#]|$)/, { timeout: 60_000 });
  const path = new URL(page.url()).pathname;
  if (!path.startsWith(redirectPath)) {
    await page.goto(`${baseURL}${redirectPath}`, { waitUntil: 'domcontentloaded' });
  }
  await expect(page).not.toHaveURL(/\/login([?#]|$)/, { timeout: 20_000 });
}

async function auditSection(page, section) {
  const paths = STATIC_PATHS[section];
  const rows = [];
  for (const path of paths) {
    const consoleErrors = [];
    const pageErrors = [];
    const documentResponses = [];
    const handleConsole = (message) => {
      if (message.type() !== 'error') return;
      consoleErrors.push(message.text());
    };
    const handlePageError = (error) => {
      pageErrors.push(error?.message ?? String(error));
    };
    const handleResponse = (response) => {
      if (response.request().resourceType() !== 'document') return;
      documentResponses.push({
        status: response.status(),
        url: response.url(),
      });
    };

    page.on('console', handleConsole);
    page.on('pageerror', handlePageError);
    page.on('response', handleResponse);

    try {
      await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (error) {
      const message = error?.message ?? String(error);
      const isRecoverableNavigationInterruption =
        message.includes('net::ERR_ABORTED') || message.includes('interrupted by another navigation');
      if (!isRecoverableNavigationInterruption) throw error;
      await page.waitForLoadState('domcontentloaded').catch(() => {});
    } finally {
      page.off('console', handleConsole);
      page.off('pageerror', handlePageError);
      page.off('response', handleResponse);
    }

    const finalUrl = page.url();
    const title = await page.title();
    const bodyText = normalizeBodyText(
      await page.evaluate(() => document.body?.innerText ?? '').catch(() => '')
    );
    const documentResponse =
      documentResponses.find((response) => response.url === finalUrl) ?? documentResponses.at(-1) ?? null;

    rows.push(
      classifyPortalAuditRow({
        path,
        finalUrl,
        title,
        bodyText,
        documentStatus: documentResponse?.status ?? null,
        consoleErrors,
        pageErrors,
      })
    );
  }
  return rows;
}

function normalizeBodyText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

async function main() {
  if (!email || !password) {
    console.error(
      'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD (legacy PLAYWRIGHT_MEMBER_EMAIL / PLAYWRIGHT_PORTAL_PASSWORD still work)'
    );
    process.exit(1);
  }

  const sections = sectionsToRun();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  /** One login using first section’s entry (super-admin test user can reach all surfaces). */
  const firstSection = sections[0];
  await login(page, SECTION_LOGIN_REDIRECT[firstSection]);

  const result = {
    baseURL,
    credentialSource,
    portalAuditSection: sectionArg,
    generatedAt: new Date().toISOString(),
    dynamicPathsNote: DYNAMIC_PATHS,
    sections: {},
  };

  for (const section of sections) {
    console.error(`Auditing section: ${section} (${STATIC_PATHS[section].length} paths)...`);
    result.sections[section] = {
      loginRedirect: SECTION_LOGIN_REDIRECT[section],
      rows: await auditSection(page, section),
    };
  }

  await browser.close();

  const outPath = join(root, 'docs', 'portal-audit-results.json');
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${outPath}`);

  for (const section of sections) {
    const rows = result.sections[section].rows;
    const problems = rows.filter((r) => !r.ok);
    console.log(`\n## ${section} (${rows.length} static paths)`);
    console.log(`OK: ${rows.length - problems.length}  failed: ${problems.length}`);
    for (const r of problems) {
      console.log(`  ! ${r.path} -> ${r.failureReasons.join(', ')} | ${r.title}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
