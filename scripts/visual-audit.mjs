/**
 * Visual audit script — screenshots every major marketing page at desktop + mobile
 * Run: node scripts/visual-audit.mjs
 * Output: /tmp/wap-visual-audit/
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = '/tmp/wap-visual-audit';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { route: '/', name: 'homepage' },
  { route: '/employers', name: 'employers' },
  { route: '/programs', name: 'programs' },
  { route: '/how-it-works', name: 'how-it-works' },
  { route: '/salary-guide', name: 'salary-guide' },
  { route: '/contact', name: 'contact' },
  { route: '/faq', name: 'faq' },
  { route: '/blog', name: 'blog' },
  { route: '/what-we-do', name: 'what-we-do' },
  { route: '/program-comparison', name: 'program-comparison' },
  { route: '/apply', name: 'apply' },
  { route: '/apply/confirmation', name: 'apply-confirmation' },
  { route: '/leadership', name: 'leadership' },
  { route: '/find-your-path', name: 'find-your-path' },
];

const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

const issues = [];

async function audit() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  console.log('Browser launched');

  for (const { route, name } of PAGES) {
    const url = `${BASE}${route}`;
    console.log(`\n📸 ${name} (${url})`);

    // Desktop
    try {
      const page = await browser.newPage();
      await page.setViewportSize(DESKTOP);
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      const status = res?.status();
      const screenshotPath = path.join(OUT, `${name}-desktop.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Check for console errors
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      // Check mobile-only sections visible on desktop (the drift issue)
      const mobileBleed = await page.evaluate(() => {
        const mobileEls = document.querySelectorAll('[class*="wa-sm"][class*="hidden"], [class*="wa-md"][class*="hidden"]');
        // Check if any mobile section is actually visible at desktop width
        const bleeding = [];
        document.querySelectorAll('[class*="wa-sm\\:wa-hidden"], [class*="wa-md\\:wa-hidden"]').forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none') bleeding.push(el.tagName + ' ' + el.className.slice(0, 80));
        });
        return bleeding;
      });

      console.log(`  Desktop ${status === 200 ? '✅' : '❌ ' + status} → ${screenshotPath}`);
      if (mobileBleed.length) {
        console.log(`  ⚠️  Mobile sections bleeding: ${mobileBleed.length}`);
        issues.push({ page: name, type: 'mobile-bleed-desktop', count: mobileBleed.length });
      }
      await page.close();
    } catch (e) {
      console.log(`  Desktop ❌ ERROR: ${e.message}`);
      issues.push({ page: name, type: 'error-desktop', message: e.message });
    }

    // Mobile
    try {
      const page = await browser.newPage();
      await page.setViewportSize(MOBILE);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      const screenshotPath = path.join(OUT, `${name}-mobile.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  Mobile  ✅ → ${screenshotPath}`);
      await page.close();
    } catch (e) {
      console.log(`  Mobile  ❌ ERROR: ${e.message}`);
      issues.push({ page: name, type: 'error-mobile', message: e.message });
    }
  }

  await browser.close();

  console.log('\n=== VISUAL AUDIT COMPLETE ===');
  console.log(`Screenshots: ${OUT}/`);
  console.log(`Pages audited: ${PAGES.length}`);
  if (issues.length === 0) {
    console.log('✅ No issues detected');
  } else {
    console.log(`⚠️  ${issues.length} issues:`);
    issues.forEach(i => console.log(`  - ${i.page}: ${i.type}${i.message ? ' — ' + i.message : ''}`));
  }
  
  // Write report
  const report = { timestamp: new Date().toISOString(), pages: PAGES.length, issues };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Report: ${OUT}/report.json`);
}

audit().catch(e => { console.error(e); process.exit(1); });
