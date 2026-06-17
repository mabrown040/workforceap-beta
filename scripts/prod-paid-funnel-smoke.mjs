#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_BASE_URL = 'https://www.workforceap.org';
const DEFAULT_BROWSE_BIN = `${process.env.HOME}/.claude/skills/gstack/browse/dist/browse`;
const DEFAULT_VIEWPORT = '390x844';

const baseUrl = (process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const browseBin = process.env.GBROWSE_BIN || DEFAULT_BROWSE_BIN;
const viewport = process.env.SMOKE_VIEWPORT || DEFAULT_VIEWPORT;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = process.env.SMOKE_OUTPUT_DIR || `/tmp/wap-prod-smoke-${stamp}`;

const paidApplyPath =
  '/apply?utm_source=google_ads&utm_medium=cpc&utm_campaign=launch_smoke';

const routes = [
  { name: 'home', path: '/', requiredText: /no-cost|workforce advancement project/i },
  { name: 'apply', path: '/apply', requiredText: /how to reach you|eligibility check|start your application/i },
  {
    name: 'apply-paid',
    path: paidApplyPath,
    requiredText: /no-cost|start eligibility|tell us how to reach you/i,
  },
  { name: 'programs', path: '/programs', requiredText: /find the right program|browse programs/i },
  { name: 'find-your-path', path: '/find-your-path', requiredText: /find your path|career path quiz/i },
  { name: 'impact', path: '/impact', requiredText: /live statistics|members served/i },
  { name: 'org-onboard', path: '/org/onboard', requiredText: /partner onboarding|invite-only/i },
  { name: 'employers', path: '/employers', requiredText: /meet role-ready talent|hiring partner/i },
  { name: 'employers-es', path: '/es/employers', requiredText: /meet role-ready talent|hiring partner/i },
  { name: 'employers-fr', path: '/fr/employers', requiredText: /meet role-ready talent|hiring partner/i },
  { name: 'employers-pt', path: '/pt/employers', requiredText: /meet role-ready talent|hiring partner/i },
  {
    name: 'employers-signup',
    path: '/employers/signup',
    requiredText: /create your employer account|upfront recruiting retainer/i,
  },
  { name: 'login', path: '/login', requiredText: /sign in|log in|email/i },
];

const riskyPublicClaimPattern =
  /120\+|\$58K|850\+ placed|\d+\s+partner compan(?:y|ies)|14 days|2[–-]4 weeks|under three weeks|ten days|start in 30 minutes|start eligibility in 30 minutes|until you land|trained, certified, and placed|actively hiring program completers|graduates average strong starting salaries|Real outcomes for real people|Real outcomes from real members|Is it really free\?|from intake through job placement|No agency spend|replacement guarantee|Job posts are free|Create Free Account|no[-\s]cost to you|no-cost training pipeline|Illustrative figures|Apply Now\s+[—-]\s+Free/i;

function runBrowseChain(route) {
  const screenshotPath = join(outputDir, `${route.name}-${viewport}.png`);
  const url = `${baseUrl}${route.path}`;
  const chain = [
    ['viewport', viewport],
    ['goto', url],
    ['wait', '--networkidle'],
    ['screenshot', '--viewport', screenshotPath],
    [
      'js',
      `JSON.stringify({
        url: location.href,
        title: document.title,
        h1: document.querySelector('h1')?.innerText ?? null,
        bodyText: document.body.innerText,
        bodyLength: document.body.innerText.length
      })`,
    ],
    ['console', '--errors'],
  ];

  const proc = spawnSync(browseBin, ['chain'], {
    input: `${JSON.stringify(chain)}\n`,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  const stdout = proc.stdout || '';
  const stderr = proc.stderr || '';
  const combined = `${stdout}\n${stderr}`;
  const statusMatch = stdout.match(/\[goto\] Navigated to .+ \((\d{3})\)/);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  const jsMatch = stdout.match(/\[js\]\s+({[\s\S]*?})\n\n\[console\]/);
  let page = null;
  try {
    page = jsMatch ? JSON.parse(jsMatch[1]) : null;
  } catch {
    page = null;
  }

  const consoleBlock = stdout.match(/\[console\]([\s\S]*)$/)?.[1] || '';
  // Filter out third-party tracking blocks (GTM, GA) that fail in headless environments
  const thirdPartyBlockPattern = /net::ERR_CONNECTION_REFUSED|net::ERR_BLOCKED_BY_CLIENT|Failed to load resource.*googletagmanager|Failed to load resource.*google-analytics/i;
  const cleanedConsole = consoleBlock.split('\n').filter(line => !thirdPartyBlockPattern.test(line)).join('\n');
  const consoleErrors =
    !cleanedConsole.includes('(no console errors)') &&
    !cleanedConsole.includes('no console errors') &&
    /\[[^\]]*error[^\]]*\]/i.test(cleanedConsole);
  const bodyText = page?.bodyText || '';
  const requiredTextFound = route.requiredText.test(bodyText);
  const riskyClaimFound = riskyPublicClaimPattern.test(bodyText);
  const ok =
    proc.status === 0 &&
    status === 200 &&
    page?.bodyLength > 0 &&
    requiredTextFound &&
    !consoleErrors &&
    !riskyClaimFound;

  return {
    name: route.name,
    url,
    finalUrl: page?.url ?? null,
    status,
    ok,
    requiredTextFound,
    consoleErrors,
    riskyClaimFound,
    screenshotPath,
    h1: page?.h1 ?? null,
    title: page?.title ?? null,
    exitCode: proc.status,
    stderr: stderr.trim(),
    outputTail: combined.slice(-3000),
  };
}

mkdirSync(outputDir, { recursive: true });

const startedAt = new Date().toISOString();
const results = routes.map(runBrowseChain);
const failed = results.filter((r) => !r.ok);
const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  baseUrl,
  viewport,
  outputDir,
  paidApplyPath,
  passed: failed.length === 0,
  results,
};

writeFileSync(join(outputDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  `# WorkforceAP production paid-funnel smoke`,
  ``,
  `- Started: ${report.startedAt}`,
  `- Finished: ${report.finishedAt}`,
  `- Base URL: ${baseUrl}`,
  `- Viewport: ${viewport}`,
  `- Output: ${outputDir}`,
  `- Result: ${report.passed ? 'PASS' : 'FAIL'}`,
  ``,
  `| Route | Status | Result | Final URL | Screenshot |`,
  `| --- | ---: | --- | --- | --- |`,
  ...results.map((r) =>
    `| ${r.name} | ${r.status ?? 'n/a'} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.finalUrl ?? ''} | ${r.screenshotPath} |`,
  ),
  ``,
];

if (failed.length > 0) {
  lines.push(`## Failures`, ``);
  for (const r of failed) {
    lines.push(
      `- ${r.name}: status=${r.status ?? 'n/a'}, requiredText=${r.requiredTextFound}, consoleErrors=${r.consoleErrors}, riskyClaim=${r.riskyClaimFound}, exit=${r.exitCode}`,
    );
  }
  lines.push(``);
}

writeFileSync(join(outputDir, 'summary.md'), `${lines.join('\n')}\n`);

console.log(lines.join('\n'));

if (!report.passed) {
  process.exitCode = 1;
}
