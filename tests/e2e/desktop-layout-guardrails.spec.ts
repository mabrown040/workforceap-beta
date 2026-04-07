import { test, expect } from '@playwright/test';

type DesktopRouteCheck = {
  name: string;
  path: string;
  centeredSelectors: string[];
};

const DESKTOP_ROUTES: DesktopRouteCheck[] = [
  {
    name: 'homepage',
    path: '/',
    centeredSelectors: [
      'main section > div[style*="maxWidth"]',
      'main .home-credibility-bar > div',
    ],
  },
  {
    name: 'employers',
    path: '/employers',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'partners',
    path: '/partners',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'programs',
    path: '/programs',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'apply',
    path: '/apply',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'contact',
    path: '/contact',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'faq',
    path: '/faq',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'how-it-works',
    path: '/how-it-works',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'what-we-do',
    path: '/what-we-do',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'find-your-path',
    path: '/find-your-path',
    centeredSelectors: ['main section[style*="maxWidth"]', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'program-comparison',
    path: '/program-comparison',
    centeredSelectors: ['main section[style*="maxWidth"]', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'salary-guide',
    path: '/salary-guide',
    centeredSelectors: ['main section[style*="maxWidth"]', 'main section > div[style*="maxWidth"]'],
  },
  {
    name: 'blog',
    path: '/blog',
    centeredSelectors: ['main .blog-page-section > div[style*="maxWidth"]', 'main .container'],
  },
  {
    name: 'leadership',
    path: '/leadership',
    centeredSelectors: ['main .container', 'main section > div[style*="maxWidth"]'],
  },
];

test.describe('Desktop layout guardrails', () => {
  for (const route of DESKTOP_ROUTES) {
    test(`${route.name} keeps centered shell and no horizontal overflow`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);

      const result = await page.evaluate((data: { selectors: string[] }) => {
        const viewportWidth = window.innerWidth;
        const html = document.documentElement;
        const body = document.body;

        const overflowOk =
          html.scrollWidth <= viewportWidth + 1 && body.scrollWidth <= viewportWidth + 1;

        type Candidate = {
          selector: string;
          width: number;
          leftGap: number;
          rightGap: number;
          centerDelta: number;
        };

        const candidates: Candidate[] = [];

        for (const selector of data.selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width < 560 || rect.width > viewportWidth - 6 || rect.height < 40) continue;
            if (rect.bottom < 0 || rect.top > window.innerHeight * 2) continue;

            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;

            const parent = el.parentElement ? window.getComputedStyle(el.parentElement) : null;
            const centeredByMargin =
              style.marginLeft === 'auto' && style.marginRight === 'auto';
            const centeredByFlexParent =
              !!parent &&
              parent.display.includes('flex') &&
              parent.justifyContent.includes('center');

            if (!centeredByMargin && !centeredByFlexParent) continue;

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
      ).toBeLessThanOrEqual(24);
    });
  }
});
