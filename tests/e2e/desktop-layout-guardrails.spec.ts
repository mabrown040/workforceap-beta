import { test, expect } from '@playwright/test';

type DesktopRouteCheck = {
  name: string;
  path: string;
  centeredSelectors: string[];
};

type PortalRouteCheck = {
  name: string;
  path: string;
  centeredSelectors: string[];
  centerTarget: 'viewport' | 'right-panel';
};

const DESKTOP_ROUTES: DesktopRouteCheck[] = [
  {
    name: 'homepage',
    path: '/en',
    centeredSelectors: [
      'main section > div[style*="max-width"]',
      'main .home-credibility-bar > div',
    ],
  },
  {
    name: 'employers',
    path: '/en/employers',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'partners',
    path: '/en/partners',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'programs',
    path: '/en/programs',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'apply',
    path: '/en/apply',
    centeredSelectors: [
      'main .container',
      'main .apply-grid-layout',
      'main > div[style*="max-width"]',
      'main section > div[style*="max-width"]',
    ],
  },
  {
    name: 'contact',
    path: '/en/contact',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'faq',
    path: '/en/faq',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'how-it-works',
    path: '/en/how-it-works',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'what-we-do',
    path: '/en/what-we-do',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'find-your-path',
    path: '/en/find-your-path',
    centeredSelectors: ['main section[style*="max-width"]', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'program-comparison',
    path: '/en/program-comparison',
    centeredSelectors: ['main section[style*="max-width"]', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'salary-guide',
    path: '/en/salary-guide',
    centeredSelectors: ['main section[style*="max-width"]', 'main section > div[style*="max-width"]'],
  },
  {
    name: 'blog',
    path: '/en/blog',
    centeredSelectors: ['main .blog-page-section > div[style*="max-width"]', 'main .container'],
  },
  {
    name: 'leadership',
    path: '/en/leadership',
    centeredSelectors: ['main .container', 'main section > div[style*="max-width"]'],
  },
];

const DESKTOP_PORTAL_ROUTES: PortalRouteCheck[] = [
  {
    name: 'login',
    path: '/login?redirectTo=/dashboard',
    centeredSelectors: [
      'main div[style*="max-width: 420"]',
      'main div[style*="max-width:420"]',
    ],
    centerTarget: 'right-panel',
  },
  {
    name: 'signup',
    path: '/signup',
    centeredSelectors: [
      'main div[style*="max-width: 440"]',
      'main div[style*="max-width:440"]',
    ],
    centerTarget: 'right-panel',
  },
  {
    name: 'forgot-password',
    path: '/forgot-password',
    centeredSelectors: [
      'main div[style*="max-width: 420"]',
      'main div[style*="max-width:420"]',
    ],
    centerTarget: 'viewport',
  },
  {
    name: 'partner-signup',
    path: '/en/partners#partner-signup',
    centeredSelectors: [
      '#partner-signup .signup-form',
    ],
    centerTarget: 'right-panel',
  },
];

const PROTECTED_PORTAL_PATHS = ['/dashboard', '/partner', '/employer', '/admin'];
const AUTH_STORAGE_STATE = process.env.PLAYWRIGHT_ADMIN_STORAGE_STATE || process.env.PLAYWRIGHT_STORAGE_STATE;

test.describe('Desktop layout guardrails', () => {
  for (const route of DESKTOP_ROUTES) {
    test(`${route.name} keeps centered shell and no horizontal overflow`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor({ state: 'attached' });
      await page.waitForTimeout(250);

      const result = await page.evaluate((data: { selectors: string[] }) => {
        const viewportWidth = window.innerWidth;
        const html = document.documentElement;
        const body = document.body;
        const overflowOk =
          html.scrollWidth <= viewportWidth + 1 &&
          body.scrollWidth <= viewportWidth + 1;

        type Candidate = {
          selector: string;
          width: number;
          leftGap: number;
          rightGap: number;
          centerDelta: number;
        };

        const candidates: Candidate[] = [];

        for (const selector of [...data.selectors, 'main .wrap']) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 560 || rect.width > viewportWidth - 6 || rect.height < 40) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight * 2) continue;

            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;

            const leftGap = rect.left;
            const rightGap = viewportWidth - rect.right;
            const centerDelta = Math.abs(leftGap - rightGap);

            candidates.push({
              selector,
              width: rect.width,
              leftGap,
              rightGap,
              centerDelta,
            });
          }
        }

        const bestCandidate = candidates.sort((a, b) => a.centerDelta - b.centerDelta)[0] ?? null;

        return {
          overflowOk,
          candidateCount: candidates.length,
          bestCandidate,
        };
      }, { selectors: route.centeredSelectors });

      expect(
        result.overflowOk,
        `${route.path} overflows horizontally on desktop viewport`
      ).toBeTruthy();
      expect(
        result.bestCandidate,
        `${route.path} did not expose a centered content shell candidate`
      ).not.toBeNull();
      expect(
        result.bestCandidate?.centerDelta ?? 999,
        `${route.path} centered shell is imbalanced left/right`
      ).toBeLessThanOrEqual(36);
    });
  }
});

test.describe('Desktop portal guardrails (unauth)', () => {
  const evaluatePortalDesktopLayout = async (
     
    page: any,
    selectors: string[],
    centerTarget: 'viewport' | 'right-panel',
  ) =>
    page.evaluate(
      (data: { selectors: string[]; centerTarget: 'viewport' | 'right-panel' }) => {
        const viewportWidth = window.innerWidth;
        const html = document.documentElement;
        const body = document.body;
        const overflowOk =
          html.scrollWidth <= viewportWidth + 1 &&
          body.scrollWidth <= viewportWidth + 1;

        const candidates: Array<{ selector: string; centerX: number; width: number; left: number; right: number }> = [];

        for (const selector of data.selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 280 || rect.width > 760 || rect.height < 120) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
            candidates.push({
              selector,
              centerX: rect.left + rect.width / 2,
              width: rect.width,
              left: rect.left,
              right: rect.right,
            });
          }
        }

        const expectedCenterX = data.centerTarget === 'right-panel' ? viewportWidth * 0.75 : viewportWidth * 0.5;
        const bestCandidate =
          candidates
            .sort((a, b) => Math.abs(a.centerX - expectedCenterX) - Math.abs(b.centerX - expectedCenterX))[0] ?? null;

        return { overflowOk, bestCandidate, expectedCenterX };
      },
      { selectors, centerTarget },
    );

  for (const route of DESKTOP_PORTAL_ROUTES) {
    test(`${route.name} keeps desktop portal shell aligned`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor({ state: 'attached' });
      if (route.name === 'partner-signup') {
        await page.locator('#partner-signup-form').scrollIntoViewIfNeeded();
      }
      await page.waitForTimeout(250);

      const result = await evaluatePortalDesktopLayout(page, route.centeredSelectors, route.centerTarget);

      expect(result.overflowOk, `${route.path} overflows horizontally on desktop viewport`).toBeTruthy();
      expect(result.bestCandidate, `${route.path} did not expose a desktop portal shell candidate`).not.toBeNull();
      expect(
        Math.abs((result.bestCandidate?.centerX ?? 0) - result.expectedCenterX),
        `${route.path} primary shell is misaligned for desktop target`,
      ).toBeLessThanOrEqual(110);
      expect(result.bestCandidate?.left ?? 0, `${route.path} shell is clipped on the left`).toBeGreaterThanOrEqual(12);
      expect(result.bestCandidate?.right ?? 9999, `${route.path} shell is clipped on the right`).toBeLessThanOrEqual(1428);
    });
  }

  for (const protectedPath of PROTECTED_PORTAL_PATHS) {
    test(`unauth ${protectedPath} redirects to login and stays aligned`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(protectedPath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);

      await expect(page).toHaveURL(/\/login\?/);
      const redirectedUrl = new URL(page.url());
      expect(redirectedUrl.pathname).toMatch(/^\/(?:en\/)?login$/);
      expect(redirectedUrl.searchParams.get('redirectTo')).toBe(protectedPath);

      const result = await evaluatePortalDesktopLayout(
        page,
        ['main div[style*="max-width: 420"]', 'main div[style*="max-width:420"]', 'main form'],
        'right-panel',
      );
      expect(result.overflowOk, `login redirect shell overflows on ${protectedPath}`).toBeTruthy();
      expect(result.bestCandidate, `login redirect shell missing on ${protectedPath}`).not.toBeNull();
    });
  }
});

if (AUTH_STORAGE_STATE) {
  test.describe('Desktop portal guardrails (authenticated)', () => {
    test.use({ storageState: AUTH_STORAGE_STATE });

    const AUTH_PORTAL_ROUTES = [
      {
        name: 'dashboard',
        path: '/dashboard',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
      {
        name: 'dashboard-ai-tools',
        path: '/dashboard/ai-tools',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
      {
        name: 'dashboard-jobs',
        path: '/dashboard/jobs',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
      {
        name: 'partner',
        path: '/partner',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
      {
        name: 'employer',
        path: '/employer',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
      {
        name: 'admin-jobs',
        path: '/admin/jobs?filter=all',
        centeredSelectors: [
          'main .container',
          'main .workspace-shell-main',
          'main .portal-shell-main',
          'main [style*="max-width"]',
        ],
      },
    ];

    for (const route of AUTH_PORTAL_ROUTES) {
      test(`${route.name} keeps centered portal shell (authenticated desktop)`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await expect(page).not.toHaveURL(/\/login/);
        await page.waitForTimeout(200);

        const result = await page.evaluate((data: { selectors: string[] }) => {
          const viewportWidth = window.innerWidth;
          const html = document.documentElement;
          const body = document.body;
          const overflowOk =
            html.scrollWidth <= viewportWidth + 1 &&
            body.scrollWidth <= viewportWidth + 1;

          const candidates: Array<{
            selector: string;
            centerDelta: number;
            left: number;
            right: number;
            width: number;
          }> = [];

          for (const selector of data.selectors) {
            const elements = Array.from(document.querySelectorAll(selector));
            for (const el of elements) {
              const rect = el.getBoundingClientRect();
              if (rect.width < 420 || rect.width > viewportWidth - 6 || rect.height < 60) continue;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              if (rect.bottom < 0 || rect.top > window.innerHeight * 2) continue;
              const leftGap = rect.left;
              const rightGap = viewportWidth - rect.right;
              candidates.push({
                selector,
                centerDelta: Math.abs(leftGap - rightGap),
                left: rect.left,
                right: rect.right,
                width: rect.width,
              });
            }
          }

          const bestCandidate =
            candidates.sort((a, b) => a.centerDelta - b.centerDelta)[0] ?? null;

          return { overflowOk, bestCandidate };
        }, { selectors: route.centeredSelectors });

        expect(result.overflowOk, `${route.path} overflows horizontally on desktop`).toBeTruthy();
        expect(result.bestCandidate, `${route.path} missing centered portal shell candidate`).not.toBeNull();
        expect(result.bestCandidate?.centerDelta ?? 999, `${route.path} portal shell center drift`).toBeLessThanOrEqual(60);
      });
    }
  });
}
