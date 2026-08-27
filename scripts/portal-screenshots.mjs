#!/usr/bin/env node
/**
 * portal-screenshots.mjs — reliable before/after screenshots of the authed
 * portal WITHOUT a database or a logged-in session.
 *
 * How it works: the app ships "Storybook-lite" showcase routes under /dev/*
 * (app/dev/{kit,dashboard,voice-studio,compare}) that render the real portal
 * components with representative mock data (`force-static`, no auth/DB). They
 * are only blocked when VERCEL_ENV=production, so locally they render freely.
 *
 * The two things that otherwise break a local run, handled here:
 *   1. The root layout calls prisma.organization.findUnique — set
 *      __PRISMA_PLACEHOLDER_DB=1 so it uses the seeded fallback org instead of
 *      hitting a DB (lib/tenant/organization.ts).
 *   2. Playwright's bundled Chromium revision may not match this repo's pin, so
 *      we fall back to the container's preinstalled browser at
 *      /opt/pw-browsers/chromium when present.
 *
 * This script owns the dev-server lifecycle in a single foreground process
 * (spawn -> wait -> shoot -> clean SIGTERM), so it never leaves a half-killed
 * server behind (which is what corrupts .next and causes exit-144 cold starts).
 *
 * Usage:
 *   node scripts/portal-screenshots.mjs                 # light, desktop, all routes
 *   node scripts/portal-screenshots.mjs --dark          # also capture dark mode
 *   node scripts/portal-screenshots.mjs --mobile        # also capture 390px
 *   node scripts/portal-screenshots.mjs --only voice-studio
 *   node scripts/portal-screenshots.mjs --out /tmp/shots --label after
 *   node scripts/portal-screenshots.mjs --base http://localhost:3000  # reuse a running server
 *   node scripts/portal-screenshots.mjs --clean         # rm -rf .next first (recover a corrupted cache)
 *
 * Before/after recipe (no DB needed):
 *   node scripts/portal-screenshots.mjs --dark --label after
 *   git stash   # or: git checkout <base> -- <changed files>
 *   node scripts/portal-screenshots.mjs --dark --label before
 *   git stash pop
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const PORT = Number(opt('port', '3200'));
const BASE = opt('base', null); // if set, reuse a running server instead of spawning
const OUT = opt('out', '.artifacts/portal-screenshots');
const LABEL = opt('label', '');
const ONLY = opt('only', null);
const WITH_DARK = flag('dark');
const WITH_MOBILE = flag('mobile');
const CLEAN = flag('clean');

// The showcase routes (real components, mock data). `tab` clicks a role=tab
// control before shooting (VoiceStudioKit exposes real ARIA tabs).
const TARGETS = [
  { name: 'dashboard', path: '/dev/dashboard' },
  { name: 'kit', path: '/dev/kit' },
  { name: 'voice-live', path: '/dev/voice-studio', tab: 'Live' },
  { name: 'voice-toolkit', path: '/dev/voice-studio', tab: 'Toolkit' },
  { name: 'voice-resume', path: '/dev/voice-studio', tab: 'Resume' },
  { name: 'compare', path: '/dev/compare' },
  // Member kit tabs (app/dev/member/** showcase routes, mock data)
  { name: 'member-home', path: '/dev/member/home' },
  { name: 'member-jobs', path: '/dev/member/jobs' },
  { name: 'member-jobs-empty', path: '/dev/member/jobs-empty' },
  { name: 'member-certificates', path: '/dev/member/certificates' },
  { name: 'member-certificates-empty', path: '/dev/member/certificates-empty' },
  { name: 'member-messages', path: '/dev/member/messages' },
  { name: 'member-profile', path: '/dev/member/profile' },
  { name: 'member-program', path: '/dev/member/program' },
  { name: 'member-progress', path: '/dev/member/progress' },
  { name: 'member-toolkit', path: '/dev/member/toolkit' },
  { name: 'member-assessment', path: '/dev/member/assessment' },
  { name: 'member-assessment-form', path: '/dev/member/assessment?state=form' },
  { name: 'member-missions', path: '/dev/member/missions' },
  // Portal Command Centers (app/dev/staff/*-command showcase routes, mock data)
  { name: 'admin-command', path: '/dev/staff/admin-command' },
  { name: 'counselor-command', path: '/dev/staff/counselor-command' },
  { name: 'employer-command', path: '/dev/staff/employer-command' },
  { name: 'partner-command', path: '/dev/staff/partner-command' },
  // Inner-page Command Center redesigns (R18 showcase routes)
  { name: 'counselor-atrisk', path: '/dev/staff/counselor-atrisk' },
  { name: 'employer-jobs', path: '/dev/staff/employer-jobs' },
  { name: 'partner-members', path: '/dev/staff/partner-members' },
  // Staff kits (app/dev/staff/** showcase routes, mock data)
  { name: 'staff-partner', path: '/dev/staff/partner' },
  { name: 'staff-placements', path: '/dev/staff/placements' },
  { name: 'staff-jobs-board', path: '/dev/staff/jobs-board' },
  { name: 'staff-pipeline-funnel', path: '/dev/staff/pipeline-funnel' },
  { name: 'staff-crons-monitor', path: '/dev/staff/crons-monitor' },
  { name: 'staff-counselors', path: '/dev/staff/counselors' },
].filter((t) => !ONLY || t.name === ONLY || t.path.includes(ONLY));

const DEV_ENV = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy_anon_key',
  POSTGRES_PRISMA_URL: 'postgresql://u:p@localhost:5432/db?schema=public',
  POSTGRES_URL_NON_POOLING: 'postgresql://u:p@localhost:5432/db',
  SUPABASE_SERVICE_ROLE_KEY: 'dummy_service_key',
  NEXT_PUBLIC_CAPTCHA_ENABLED: 'false',
  NEXT_TELEMETRY_DISABLED: '1',
  __PRISMA_PLACEHOLDER_DB: '1',
};

function resolveExecutablePath() {
  for (const p of ['/opt/pw-browsers/chromium']) {
    if (existsSync(p)) return p;
  }
  return undefined; // let Playwright use its bundled browser
}

async function waitForReady(base, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/dev/kit`, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 200) return true;
    } catch {
      /* not up yet */
    }
    await sleep(2500);
  }
  return false;
}

async function shoot(context, target, mode) {
  const page = await context.newPage();
  const base = BASE ?? `http://localhost:${PORT}`;
  await page.goto(`${base}${target.path}`, { waitUntil: 'networkidle', timeout: 90_000 });
  if (mode === 'dark') {
    // ThemeInitScript reads localStorage 'wap-theme'; also force the class in
    // case the init script already ran before our storage write took effect.
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(250);
  }
  if (target.tab) {
    const tab = page.getByRole('tab', { name: target.tab });
    if (await tab.count()) {
      await tab.first().click();
      await page.waitForTimeout(400);
    }
  }
  const suffix = [LABEL, mode].filter(Boolean).join('-');
  const file = `${OUT}/${suffix ? suffix + '-' : ''}${target.name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  shot ${file}`);
  await page.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  let devProc = null;

  if (!BASE) {
    if (CLEAN && existsSync('.next')) {
      console.log('cleaning .next ...');
      rmSync('.next', { recursive: true, force: true });
    }
    console.log(`starting next dev on :${PORT} (placeholder DB) ...`);
    devProc = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
      env: DEV_ENV,
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: false,
    });
    const ready = await waitForReady(`http://localhost:${PORT}`);
    if (!ready) {
      console.error('dev server did not become ready; try --clean to reset .next');
      if (devProc) devProc.kill('SIGTERM');
      process.exit(1);
    }
    console.log('dev server ready');
  }

  const browser = await chromium.launch({ executablePath: resolveExecutablePath() });
  try {
    const modes = ['light', ...(WITH_DARK ? ['dark'] : [])];
    const viewports = [
      { name: 'desktop', width: 1440, height: 1600 },
      ...(WITH_MOBILE ? [{ name: 'mobile', width: 390, height: 1600 }] : []),
    ];
    for (const vp of viewports) {
      for (const mode of modes) {
        console.log(`[${vp.name} / ${mode}]`);
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: mode === 'dark' ? 'dark' : 'light',
          deviceScaleFactor: 1,
        });
        await context.addInitScript((m) => {
          try {
            localStorage.setItem('wap-theme', m);
          } catch {}
        }, mode);
        for (const target of TARGETS) {
          const t =
            viewports.length > 1 ? { ...target, name: `${vp.name}-${target.name}` } : target;
          // Per-target isolation: one bad route (500, hang, missing element)
          // must not abort the whole capture batch.
          try {
            await shoot(context, t, mode);
          } catch (err) {
            console.error(`  SKIP ${t.name} [${mode}]: ${err.message?.split('\n')[0] ?? err}`);
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (devProc) {
      devProc.kill('SIGTERM');
      // give Next a beat to flush .next cleanly so the next cold start isn't corrupted
      await sleep(1500);
      if (!devProc.killed) devProc.kill('SIGKILL');
    }
  }
  console.log(`done -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
