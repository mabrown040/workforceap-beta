/**
 * Cross-portal route audit: visits every static path for selected section(s) after one login.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://workforceap-beta.vercel.app \
 *   PLAYWRIGHT_MEMBER_EMAIL=... PLAYWRIGHT_PORTAL_PASSWORD=... \
 *   node scripts/audit-portal-routes.mjs
 *
 * Optional:
 *   PORTAL_AUDIT_SECTION=all|member|admin|employer|partner|counselor   (default: all)
 *
 * Writes: docs/portal-audit-results.json
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  STATIC_PATHS,
  DYNAMIC_PATHS,
  SECTION_LOGIN_REDIRECT,
} from './lib/portal-audit-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.PLAYWRIGHT_MEMBER_EMAIL ?? '';
const password = process.env.PLAYWRIGHT_PORTAL_PASSWORD ?? '';
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
  await page.getByLabel(/institutional id/i).fill(email);
  await page.getByLabel(/access key/i).fill(password);
  await page.getByRole('button', { name: /authenticate access/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 });
}

async function auditSection(page, section) {
  const paths = STATIC_PATHS[section];
  const rows = [];
  for (const path of paths) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const finalUrl = page.url();
    const title = await page.title();
    const stuckLogin = finalUrl.includes('/login');
    rows.push({ path, finalUrl, title, stuckLogin });
  }
  return rows;
}

async function main() {
  if (!email || !password) {
    console.error('Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_PORTAL_PASSWORD');
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
    const problems = rows.filter((r) => r.stuckLogin);
    console.log(`\n## ${section} (${rows.length} static paths)`);
    console.log(`OK: ${rows.length - problems.length}  stuck on /login: ${problems.length}`);
    for (const r of problems) {
      console.log(`  ! ${r.path} -> LOGIN | ${r.title}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
