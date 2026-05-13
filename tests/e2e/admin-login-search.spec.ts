import { test, expect } from "@playwright/test";
import { hasAdminE2ECredentials, loginAdminPortal } from "./auth-helpers";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe("Admin login + member search", () => {
  test.beforeEach(() => {
    test.skip(!hasAdminE2ECredentials(), "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");
  });

  test("admin login redirects to admin dashboard", async ({ page }) => {
    await loginAdminPortal(page);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15000 });
  });

  test("admin can navigate to members list", async ({ page }) => {
    await loginAdminPortal(page);
    await page.goto("/admin/members");
    await expect(page.getByRole("heading", { name: /members/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".admin-members-search-input, input[placeholder*=\"Search\"]").first()).toBeVisible();
  });

  test("admin can search for a member", async ({ page }) => {
    await loginAdminPortal(page);
    await page.goto("/admin/members");
    const searchInput = page.locator(".admin-members-search-input, input[placeholder*=\"Search\"]").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("test");
    await page.waitForTimeout(500);
    await expect(page.locator(".admin-members-table-root, table, .data-table").first()).toBeVisible();
  });

  test("admin member search works on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAdminPortal(page);
    await page.goto("/admin/members");
    await expect(page.getByRole("heading", { name: /members/i })).toBeVisible({ timeout: 15000 });
    const searchInput = page.locator(".admin-members-search-input, input[placeholder*=\"Search\"]").first();
    await expect(searchInput).toBeVisible();
  });

  test("admin can open a member detail page", async ({ page }) => {
    await loginAdminPortal(page);
    await page.goto("/admin/members");
    await expect(page.locator(".admin-members-table-root, table, .data-table").first()).toBeVisible({ timeout: 15000 });
    const firstMemberLink = page.locator("a[href^=\"/admin/members/\"]").first();
    const rowCount = await firstMemberLink.count();
    test.skip(rowCount === 0, "No members in table to click");
    await firstMemberLink.click();
    await expect(page).toHaveURL(/\/admin\/members\//);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15000 });
  });
});
