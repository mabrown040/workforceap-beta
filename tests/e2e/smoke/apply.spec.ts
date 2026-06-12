import { test, expect } from '@playwright/test';

/**
 * Apply page smoke test — verifies the public application page loads
 * and renders the form area and sidebar.
 */
test.describe('Apply smoke', () => {
  test('apply page loads with hero and form area', async ({ page }) => {
    await page.goto('/apply');

    // Hero heading
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

    // Application form or eligibility client wrapper
    await expect(page.locator('.apply-main-form, form, [class*="eligibility"]').first()).toBeVisible();

    // Mobile step breadcrumb (sidebar progress hidden below 768px)
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('.apply-mobile-step-nav')).toBeVisible();
    await expect(page.locator('.apply-mobile-step-nav__item--active')).toContainText(/eligibility|you/i);
    await expect(page.locator('.apply-mobile-trust-bar')).toBeVisible();
    await expect(page.locator('.apply-mobile-trust-bar')).toContainText(/501\(c\)\(3\)|no cost/i);
    await expect(page.locator('.apply-mobile-trust-bar__phone')).toHaveAttribute('href', 'tel:+15127771808');

    // Sidebar with progress steps
    await expect(page.locator('.apply-sidebar, aside').first()).toBeVisible();

    // Contact / help link or phone
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();

    // Sticky apply CTA appears after scrolling past hero (organic mobile parity with paid)
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(page.locator('.apply-organic-sticky-cta')).toBeVisible();
    await expect(page.locator('.apply-organic-sticky-cta__button')).toContainText(/start your application/i);
  });
});
