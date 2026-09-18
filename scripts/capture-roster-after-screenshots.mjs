#!/usr/bin/env node
/**
 * Capture after screenshots for admin roster sort verification (dev showcase routes).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUT_DIR =
  process.argv[2] ||
  '/cursor/stores/bc-0fb6dd6a-b83e-4730-8bca-9ef692c356b1/media/training-progress';

const TARGETS = [
  {
    url: 'http://127.0.0.1:3000/dev/staff/training-progress',
    sortButton: /^Sort by Student/,
    outFile: 'after-training-progress.png',
  },
  {
    url: 'http://127.0.0.1:3000/dev/staff/students-roster',
    sortButton: /^Sort by Student/,
    outFile: 'after-students.png',
  },
];

async function waitForServer(page, url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
      if (response && response.ok()) return;
    } catch {
      await page.waitForTimeout(1000);
    }
  }
  throw new Error(`Server not ready for ${url}`);
}

async function captureComposite(page, target) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await waitForServer(page, target.url);
  const surface = page.locator('div.wa-p-6[data-surface="dense"]').first();
  await surface.waitFor({ state: 'visible' });
  const sortButton = surface.getByRole('button', { name: target.sortButton }).first();
  await sortButton.waitFor({ state: 'visible', timeout: 15000 });
  await sortButton.click();
  await page.waitForTimeout(400);

  const desktopPath = path.join(OUT_DIR, `.tmp-${target.outFile}-desktop.png`);
  const narrowPath = path.join(OUT_DIR, `.tmp-${target.outFile}-narrow.png`);
  const outPath = path.join(OUT_DIR, target.outFile);

  await surface.screenshot({ path: desktopPath });

  await page.setViewportSize({ width: 960, height: 960 });
  await page.waitForTimeout(200);
  await surface.screenshot({ path: narrowPath });

  // Stack desktop + narrow into one deliverable PNG when ImageMagick is available.
  const montage = `convert "${desktopPath}" "${narrowPath}" -append "${outPath}"`;
  try {
    execSync(montage, { stdio: 'ignore' });
    fs.unlinkSync(desktopPath);
    fs.unlinkSync(narrowPath);
  } catch {
    fs.copyFileSync(desktopPath, outPath);
    fs.unlinkSync(desktopPath);
    if (fs.existsSync(narrowPath)) fs.unlinkSync(narrowPath);
  }

  console.log(`Saved ${outPath}`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const target of TARGETS) {
    await captureComposite(page, target);
  }
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
