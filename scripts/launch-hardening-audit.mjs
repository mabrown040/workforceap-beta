import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, 'app');
const OUT_DIR = path.join(ROOT, 'artifacts');
const OUT_FILE = path.join(
  OUT_DIR,
  `launch-hardening-dossier-${new Date().toISOString().slice(0, 10)}.md`
);

const LOCAL_BASE = process.env.LOCAL_BASE || 'http://127.0.0.1:3000';
const LIVE_BASE = 'https://workforceap.org';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return [full];
    })
  );
  return files.flat();
}

function normalizeRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, '/');
  const route = rel
    .replace(/\/page\.tsx$/, '')
    .replace(/^page\.tsx$/, '')
    .replace(/\([^/]+\)\//g, '')
    .replace(/\[([^\]]+)\]/g, ':$1');
  return `/${route}`.replace(/\/+/g, '/');
}

/** Same roots as middleware PORTAL_PATHS member-facing segments (not partner/employer/counselor). */
const MEMBER_PORTAL_PREFIXES = [
  '/dashboard',
  '/resources',
  '/help',
  '/applications',
  '/account',
  '/profile',
  '/certifications',
];

function pathMatchesSegment(route, segment) {
  const base = `/${segment}`;
  return route === base || route.startsWith(`${base}/`);
}

function roleFromRoute(route) {
  if (pathMatchesSegment(route, 'admin')) return 'admin';
  if (pathMatchesSegment(route, 'counselor')) return 'counselor';
  if (pathMatchesSegment(route, 'partner')) return 'partner';
  if (pathMatchesSegment(route, 'employer')) return 'employer';
  if (MEMBER_PORTAL_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`))) return 'member';
  if (route.startsWith('/login') || route.startsWith('/signup') || route.startsWith('/forgot-password')) return 'auth-public';
  return 'public';
}

function isDynamic(route) {
  return route.includes(':');
}

async function getStatus(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location') };
  } catch (error) {
    return { status: 0, error: String(error) };
  }
}

async function runBrowserChecks() {
  const criticalRoutes = [
    '/',
    '/programs',
    '/apply',
    '/how-it-works',
    '/contact',
    '/login',
    '/dashboard',
    '/counselor',
    '/admin',
    '/employer',
    '/partner',
  ];
  const viewports = [
    { name: 'desktop', config: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', config: devices['iPhone 13'] },
  ];
  const checks = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext(viewport.config);
      for (const route of criticalRoutes) {
        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => pageErrors.push(err.message));
        const localUrl = `${LOCAL_BASE}${route}`;
        try {
          const response = await page.goto(localUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
          });
          await page.waitForTimeout(1200);
          checks.push({
            scope: 'local',
            viewport: viewport.name,
            route,
            finalUrl: page.url(),
            status: response?.status() ?? 0,
            consoleErrors: consoleErrors.slice(0, 5),
            pageErrors: pageErrors.slice(0, 5),
          });
        } catch (error) {
          checks.push({
            scope: 'local',
            viewport: viewport.name,
            route,
            finalUrl: localUrl,
            status: 0,
            consoleErrors: [],
            pageErrors: [String(error)],
          });
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return checks;
}

function summarizeSeverity(httpRows, browserRows) {
  const findings = [];
  for (const row of httpRows) {
    if (row.scope === 'local' && row.role !== 'public' && row.status === 200) {
      findings.push({
        severity: 'P1',
        title: `Potential access boundary leak: ${row.route} returned 200 unauthenticated`,
        detail: `local ${row.route} (${row.status})`,
      });
    }
  }
  for (const row of browserRows) {
    if (row.consoleErrors.length > 0 || row.pageErrors.length > 0) {
      findings.push({
        severity: 'P1',
        title: `Runtime/browser errors on ${row.route} (${row.viewport})`,
        detail: [...row.consoleErrors, ...row.pageErrors].join(' | ').slice(0, 500),
      });
    }
  }
  return findings;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const allFiles = await walk(APP_DIR);
  const pageFiles = allFiles.filter((f) => f.endsWith(`${path.sep}page.tsx`) || f.endsWith('/page.tsx'));
  const routes = [...new Set(pageFiles.map(normalizeRoute))].sort();

  const rows = [];
  for (const route of routes) {
    if (isDynamic(route)) continue;
    const role = roleFromRoute(route);
    const local = await getStatus(`${LOCAL_BASE}${route}`);
    const live = role === 'public' || role === 'auth-public' ? await getStatus(`${LIVE_BASE}${route}`) : { status: 'blocked-auth' };
    rows.push({
      route,
      role,
      scope: 'local',
      status: local.status,
      location: local.location ?? '',
      note: local.error ?? '',
    });
    rows.push({
      route,
      role,
      scope: 'live',
      status: live.status,
      location: live.location ?? '',
      note: live.error ?? '',
    });
  }

  const browserRows = await runBrowserChecks();
  const findings = summarizeSeverity(rows.filter((r) => r.scope === 'local'), browserRows);

  const byRole = new Map();
  for (const row of rows) {
    const key = `${row.role}|${row.route}`;
    if (!byRole.has(key)) byRole.set(key, {});
    byRole.get(key)[row.scope] = row;
  }

  const matrixLines = ['| Role | Route | Local | Live | Action Status |', '|---|---|---:|---:|---|'];
  for (const [key, value] of [...byRole.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [role, route] = key.split('|');
    const localStatus = value.local?.status ?? 'n/a';
    const liveStatus = value.live?.status ?? 'n/a';
    let action = 'pass';
    if (String(localStatus).startsWith('3') || String(liveStatus).startsWith('3')) action = 'redirect';
    if (localStatus === 0 || liveStatus === 0) action = 'blocked-env';
    if (role !== 'public' && role !== 'auth-public' && localStatus === 200) action = 'fail-boundary';
    if (value.live?.status === 'blocked-auth') action = `${action}, live-auth-blocked`;
    matrixLines.push(`| ${role} | \`${route}\` | ${localStatus} | ${liveStatus} | ${action} |`);
  }

  const browserLines = ['| Scope | Viewport | Route | Status | Final URL | Errors |', '|---|---|---|---:|---|---|'];
  for (const row of browserRows) {
    const errors = [...row.consoleErrors, ...row.pageErrors].join(' ; ').replace(/\|/g, '/').slice(0, 160);
    browserLines.push(`| ${row.scope} | ${row.viewport} | \`${row.route}\` | ${row.status} | \`${row.finalUrl}\` | ${errors || 'none'} |`);
  }

  const findingsLines =
    findings.length === 0
      ? ['- No P1/P0 findings detected by automated sweep.']
      : findings.map((f) => `- **${f.severity}** ${f.title} — ${f.detail}`);

  const output = [
    '# Launch Hardening Dossier',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Coverage Summary',
    `- Total discovered routes: ${routes.length}`,
    `- Static routes verified via HTTP: ${rows.length / 2}`,
    `- Browser checks executed: ${browserRows.length}`,
    '',
    '## Role x Route/Action Matrix',
    ...matrixLines,
    '',
    '## Runtime/Desktop+Mobile Browser Verification',
    ...browserLines,
    '',
    '## Findings by Severity',
    ...findingsLines,
    '',
    '## Residual Risks',
    '- Authenticated role-specific action testing requires seeded credentials/sessions for member, counselor, admin, partner, and employer.',
    '- Dynamic routes with required IDs/slugs are excluded from unauthenticated automation unless fixtures are supplied.',
  ].join('\n');

  await fs.writeFile(OUT_FILE, output, 'utf8');
  console.log(`Wrote dossier: ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
