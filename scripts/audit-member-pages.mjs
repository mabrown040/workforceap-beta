/**
 * Member-only audit (writes member-pages-live-results.json).
 * Paths are sourced from scripts/lib/portal-audit-paths.mjs (member section).
 *
 * For all portals use: npm run audit:portal
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { STATIC_PATHS } from './lib/portal-audit-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const baseURL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.PLAYWRIGHT_MEMBER_EMAIL ?? '';
const password = process.env.PLAYWRIGHT_PORTAL_PASSWORD ?? '';

const PATHS = STATIC_PATHS.member;

async function main() {
  if (!email || !password) {
    console.error('Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_PORTAL_PASSWORD');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login?redirectTo=${encodeURIComponent('/dashboard')}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByLabel(/institutional id/i).fill(email);
  await page.getByLabel(/access key/i).fill(password);
  await page.getByRole('button', { name: /authenticate access/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  const rows = [];
  for (const path of PATHS) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const finalUrl = page.url();
    const title = await page.title();
    const stuckLogin = finalUrl.includes('/login');
    rows.push({ path, finalUrl, title, stuckLogin });
  }

  await browser.close();

  const outPath = join(root, 'docs', 'member-pages-live-results.json');
  writeFileSync(outPath, JSON.stringify({ baseURL, generatedAt: new Date().toISOString(), rows }, null, 2));
  console.log(`Wrote ${outPath}`);

  for (const r of rows) {
    const flag = r.stuckLogin ? '**LOGIN**' : 'OK';
    console.log(`| \`${r.path}\` | ${flag} | \`${r.finalUrl}\` | ${titleCell(r.title)} |`);
  }
}

function titleCell(t) {
  return t.replace(/\|/g, '\\|');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
