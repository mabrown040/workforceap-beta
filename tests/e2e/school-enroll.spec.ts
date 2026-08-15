import { test, expect } from "@playwright/test";

import { CHS_ENROLL_PATH, CHS_PARTNER_REFERRAL_CODE } from "@/lib/partners/chsPartner";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/**
 * Dynamic partner enrollment page (Phase B3) at the SAME URL the static
 * Concordia page used to serve. Requires the CHS `Partner` row to exist with
 * `enrollmentPageEnabled = true` in the target environment — a missing or
 * disabled partner renders a 404 by design.
 */
test.describe(`Partner enrollment page (${CHS_ENROLL_PATH})`, () => {
  test("renders the co-branded hero, program cards, and a referral-carrying CTA", async ({
    page,
  }) => {
    await page.goto(CHS_ENROLL_PATH);

    // Hero.
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 10000 });
    await expect(heading).toContainText(/concordia/i);

    // At least one program card, rendered from the partner's catalog.
    const cards = page.locator("article.pen-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);

    // Its "Get Started" CTA must carry BOTH the partner ref and the program —
    // the ref in the URL is the primary attribution path (middleware's cookie
    // only fires on top-level navigations).
    const getStarted = cards.first().getByRole("link", { name: /get started/i });
    await expect(getStarted).toBeVisible();
    const href = await getStarted.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href!).toContain(`ref=${CHS_PARTNER_REFERRAL_CODE}`);
    expect(href!).toMatch(/[?&]program=[a-z0-9-]+/);
    expect(href!).toContain("src=enroll");
    expect(href!).toContain("utm_medium=enrollment_page");

    // "View Program" points at the canonical detail page.
    const viewProgram = cards.first().getByRole("link", { name: /view program/i });
    await expect(viewProgram).toHaveAttribute("href", /^\/programs\/[a-z0-9-]+$/);
  });

  test("is excluded from search indexing", async ({ page }) => {
    await page.goto(CHS_ENROLL_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
  });

  test("never uses the banned no-cost adjective in student-facing copy", async ({ page }) => {
    await page.goto(CHS_ENROLL_PATH);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/\bfree\b/i);
  });

  test("renders on a mobile viewport with a reachable apply CTA", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(CHS_ENROLL_PATH);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });
    const applyCta = page.getByRole("link", { name: /start your application/i }).first();
    await expect(applyCta).toBeVisible();
    await expect(applyCta).toHaveAttribute(
      "href",
      new RegExp(`ref=${CHS_PARTNER_REFERRAL_CODE}`),
    );
  });
});
