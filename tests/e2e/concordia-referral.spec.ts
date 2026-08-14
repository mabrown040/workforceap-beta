import { test, expect } from "@playwright/test";

import { APPLY_REFERRAL_SESSION_KEY } from "@/lib/apply/applyReferralCapture";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/** Concordia High School (Phase A) referral landing link */
const CONCORDIA_APPLY_URL =
  "/apply?ref=chs2026&program=it-support-professional-certificate-ibm";

test.describe("Concordia HS referral landing (/apply?ref=chs2026)", () => {
  test("step 1 eligibility form renders with the Under 18 age option", async ({ page }) => {
    await page.goto(CONCORDIA_APPLY_URL);

    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#apply-first-name")).toBeVisible();
    await expect(page.locator("#apply-last-name")).toBeVisible();
    await expect(page.locator("#apply-email")).toBeVisible();
    await expect(page.locator("#apply-phone")).toBeVisible();

    const ageSelect = page.locator("#apply-age-group");
    await expect(ageSelect).toBeVisible();
    const under18Option = ageSelect.locator('option[value="under_18"]');
    await expect(under18Option).toHaveCount(1);
    await expect(under18Option).toHaveText("Under 18");

    // The new band must be selectable, not just present in the markup.
    await ageSelect.selectOption("under_18");
    await expect(ageSelect).toHaveValue("under_18");
  });

  test("captures the chs2026 referral code in sessionStorage", async ({ page }) => {
    await page.goto(CONCORDIA_APPLY_URL);
    await expect(page.locator("#apply-first-name")).toBeVisible({ timeout: 10000 });

    // ApplyRefCapture persists ?ref= in a client effect — poll until it lands.
    await expect
      .poll(
        async () =>
          page.evaluate((key) => sessionStorage.getItem(key), APPLY_REFERRAL_SESSION_KEY),
        { timeout: 5000 }
      )
      .toBe("chs2026");
  });

  test("step 1 renders with Under 18 option on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(CONCORDIA_APPLY_URL);

    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#apply-first-name")).toBeVisible();
    await expect(page.locator("#apply-email")).toBeVisible();

    const ageSelect = page.locator("#apply-age-group");
    await expect(ageSelect).toBeVisible();
    await expect(ageSelect.locator('option[value="under_18"]')).toHaveText("Under 18");
  });
});
