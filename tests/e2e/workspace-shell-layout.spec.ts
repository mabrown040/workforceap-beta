import { expect, test, type Page } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
test.use(executablePath ? { launchOptions: { executablePath } } : {});

type ShellMetrics = {
  viewport: { width: number; height: number };
  document: { width: number; height: number };
  root: DOMRect;
  body: DOMRect;
  sidebar: DOMRect;
  main: DOMRect;
  mainScrollHeight: number;
};

async function readShellMetrics(page: Page): Promise<ShellMetrics> {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect().toJSON();
    };
    const main = document.querySelector('.workspace-shell-main');
    if (!(main instanceof HTMLElement)) throw new Error('Missing workspace main');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      root: rect('.workspace-shell-root'),
      body: rect('.workspace-shell-body'),
      sidebar: rect('.workspace-sidebar'),
      main: rect('.workspace-shell-main'),
      mainScrollHeight: main.scrollHeight,
    };
  });
}

test.describe('desktop WorkspaceShell layout', () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 520 },
  ]) {
    test(`keeps the rail visible and main content fluid at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/dev/member/home');
      await expect(page.locator('.workspace-shell-root')).toBeVisible();

      const metrics = await readShellMetrics(page);
      expect(metrics.document.height).toBeLessThanOrEqual(metrics.viewport.height);
      expect(metrics.document.width).toBeLessThanOrEqual(metrics.viewport.width);
      expect(metrics.root.height).toBeCloseTo(metrics.viewport.height, 0);
      expect(metrics.sidebar.top).toBeCloseTo(metrics.body.top, 0);
      expect(metrics.sidebar.bottom).toBeLessThanOrEqual(metrics.viewport.height + 1);
      expect(metrics.main.left).toBeCloseTo(metrics.sidebar.right, 0);
      expect(metrics.main.right).toBeCloseTo(metrics.viewport.width, 0);
      expect(metrics.main.height).toBeCloseTo(metrics.body.height, 0);
      expect(metrics.mainScrollHeight).toBeGreaterThanOrEqual(Math.floor(metrics.main.height));
    });
  }
});

test('mobile shell remains width-safe and keeps navigation in the drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/member/home');

  await expect(page.locator('.workspace-sidebar')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.workspace-menu-btn')).toBeVisible();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});
