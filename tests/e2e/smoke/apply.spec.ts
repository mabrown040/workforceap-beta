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
    await expect(page.locator('.apply-mobile-step-nav__summary')).toContainText(/step 1 of 3 · about 5 min/i);
    await expect(page.locator('.apply-mobile-step-nav__item--active')).toContainText(/eligibility|you/i);
    await expect(page.locator('.apply-mobile-trust-bar')).toBeVisible();
    await expect(page.locator('.apply-mobile-trust-bar')).toContainText(/501\(c\)\(3\)|no cost/i);
    await expect(page.locator('.apply-mobile-trust-bar')).toContainText(/questions\? call|\(512\) 777-1808/i);
    await expect(page.locator('.apply-mobile-trust-bar__phone')).toHaveAttribute('href', 'tel:+15127771808');
    await expect(page.locator('.apply-organic-form-kicker')).toContainText(/save and finish later/i);

    // Sidebar with progress steps
    await expect(page.locator('.apply-sidebar, aside').first()).toBeVisible();

    // Contact / help link or phone
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible();

    // The form is already the active corridor after the hero, so the mobile
    // sticky CTA stays unmounted instead of covering form controls.
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(page.locator('.apply-organic-sticky-cta')).toHaveCount(0);

    // It also stays hidden at the footer so it cannot cover support links.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('.apply-organic-sticky-cta')).toHaveCount(0);
  });

  test('paid apply variant shows mobile trust cues at form entry', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/apply?utm_source=google_ads&utm_medium=cpc&utm_campaign=launch_smoke');

    await expect(page.locator('.paid-apply-hero')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.paid-apply-form-kicker')).toContainText(/eligibility check only/i);
    await expect(page.locator('.apply-mobile-trust-bar')).toBeVisible();
    await expect(page.locator('.apply-mobile-trust-bar')).toContainText(/no cost|501\(c\)\(3\)/i);
  });

  test('apply results step shows mobile trust bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/apply/results');

    await expect(page.locator('.apply-mobile-trust-bar')).toBeVisible();
    await expect(page.locator('.apply-mobile-step-nav__summary')).toContainText(/step 2 of 3 · about 2 min/i);
    await expect(page.locator('.apply-mobile-step-nav__item--active')).toContainText(/program/i);
    await expect(page.locator('.apply-funnel-form-kicker')).toContainText(/still no account required/i);
    await expect(page.locator('.apply-flow .apply-step-kicker')).not.toBeVisible();
  });

  test('create account step shows final mobile progress count', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/apply/create-account');

    await expect(page.locator('.apply-mobile-step-nav')).toBeVisible();
    await expect(page.locator('.apply-mobile-step-nav__summary')).toContainText(/step 3 of 3 · about 2 min/i);
    await expect(page.locator('.apply-mobile-step-nav__item--active')).toContainText(/account/i);
  });
});
