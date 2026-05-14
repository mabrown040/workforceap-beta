import { test, expect } from "@playwright/test";
import { hasProdE2ECredentials, loginMemberPortal } from "./auth-helpers";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe("Member login + dashboard", () => {
  test.beforeEach(() => {
    test.skip(!hasProdE2ECredentials(), "Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD");
  });

  test("login redirects to dashboard and key elements exist", async ({ page }) => {
    await loginMemberPortal(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/welcome back|welcome to workforceap/i)).toBeVisible();
    await expect(page.getByText(/training|progress|courses/i).first()).toBeVisible();
    await expect(page.getByText(/next step|priority action|quick actions/i).first()).toBeVisible();
  });

  test("dashboard loads on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginMemberPortal(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/welcome back|welcome to workforceap/i)).toBeVisible();
  });

  test("dashboard shows quick actions grid on mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginMemberPortal(page);
    await expect(page.locator(".portal-quick-grid-2x2, .portal-quick-grid-item").first()).toBeVisible({ timeout: 10000 });
  });

  test("dashboard navigation links work", async ({ page }) => {
    await loginMemberPortal(page);
    const aiToolsLink = page.getByRole("link", { name: /ai tools|career toolkit/i }).first();
    await expect(aiToolsLink).toBeVisible();
    const trainingLink = page.getByRole("link", { name: /my training|training/i }).first();
    await expect(trainingLink).toBeVisible();
  });
});
