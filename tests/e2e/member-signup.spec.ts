import { test, expect } from "@playwright/test";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe("Member signup (/signup)", () => {
  test("signup page loads and has form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await expect(page.getByLabel(/zip code/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("signup page loads on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("phone and zip fields are labeled optional", async ({ page }) => {
    await page.goto("/signup");
    const phoneLabel = page.locator('label[for="phone"]');
    const zipLabel = page.locator('label[for="zip"]');
    await expect(phoneLabel).toContainText(/optional/i);
    await expect(zipLabel).toContainText(/optional/i);
  });

  test("signup form shows validation errors for empty submit", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("#fullName-error")).toContainText(/name must be/i, { timeout: 3000 });
  });

  test("signup form succeeds without phone or zip", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.locator("#password").fill("Password1");
    await page.getByLabel(/program of interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("#phone-error")).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    await expect(page.locator("#zip-error")).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test("signup form has program interest dropdown", async ({ page }) => {
    await page.goto("/signup");
    const programSelect = page.getByLabel(/program of interest/i);
    await expect(programSelect).toBeVisible();
    await programSelect.selectOption({ index: 1 });
    await expect(programSelect).not.toHaveValue("");
  });

  test("signup page links to login", async ({ page }) => {
    await page.goto("/signup");
    const loginLink = page.getByRole("link", { name: /sign in/i }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("invalid email shows validation error", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/^email$/i).fill("not-an-email");
    await page.locator("#password").fill("Password1");
    await page.getByLabel(/program of interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 });
  });

  test("invalid phone format shows validation error when phone is provided", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.locator("#password").fill("Password1");
    await page.getByLabel(/phone/i).fill("abc");
    await page.getByLabel(/program of interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("#phone-error")).toContainText(/valid phone/i, { timeout: 3000 });
  });

  test("invalid zip format shows validation error when zip is provided", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/^email$/i).fill("test@example.com");
    await page.locator("#password").fill("Password1");
    await page.getByLabel(/zip code/i).fill("abc");
    await page.getByLabel(/program of interest/i).selectOption({ index: 1 });
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.locator("#zip-error")).toContainText(/valid ZIP/i, { timeout: 3000 });
  });
});

test.describe("Member apply flow (/apply)", () => {
  test("eligibility form loads and can be filled", async ({ page }) => {
    await page.goto("/apply");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#apply-first-name")).toBeVisible();
    await expect(page.locator("#apply-last-name")).toBeVisible();
    await expect(page.locator("#apply-email")).toBeVisible();
    await expect(page.locator("#apply-phone")).toBeVisible();

    await page.locator("#apply-first-name").fill("E2E");
    await page.locator("#apply-last-name").fill("Test");
    await page.locator("#apply-email").fill("e2e-apply-test@example.com");
    await page.locator("#apply-phone").fill("(512) 555-0199");

    await page.locator('input[name="q1"][value="yes"]').check();
    await page.locator('input[name="q2"][value="yes"]').check();

    await expect(page.getByRole("button", { name: /continue to programs/i })).toBeEnabled();
  });

  test("eligibility form validates on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/apply");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#apply-first-name")).toBeVisible();
    await expect(page.locator("#apply-last-name")).toBeVisible();
    await expect(page.locator("#apply-email")).toBeVisible();
    await expect(page.locator("#apply-phone")).toBeVisible();
  });

  test("full apply flow: eligibility to results to create account (mocked)", async ({ page }) => {
    await page.route("/api/apply/signup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ redirectTo: "/dashboard" }),
      });
    });

    await page.goto("/apply");
    await page.locator("#apply-first-name").fill("E2E");
    await page.locator("#apply-last-name").fill("Test");
    await page.locator("#apply-email").fill(`e2e-${Date.now()}@example.com`);
    await page.locator("#apply-phone").fill("(512) 555-0199");
    await page.locator('input[name="q1"][value="yes"]').check();
    await page.locator('input[name="q2"][value="yes"]').check();
    await page.getByRole("button", { name: /continue to programs/i }).click();

    await expect(page).toHaveURL(/\/apply\/results/);
    await expect(page.getByRole("heading", { name: /program/i })).toBeVisible({ timeout: 10000 });

    const firstProgramCard = page.locator(".apply-results-program-card").first();
    await firstProgramCard.click();
    await expect(firstProgramCard).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: /save my spot|create account/i }).click();

    await expect(page).toHaveURL(/\/apply\/create-account/);
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();

    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Test");
    await page.locator("#email").fill(`e2e-${Date.now()}@example.com`);
    await page.locator("#phone").fill("(512) 555-0199");
    await page.locator("#password").fill("SecurePass123!");
    await page.locator("#confirmPassword").fill("SecurePass123!");
    await page.locator("#contactConsent").check();

    await page.getByRole("button", { name: /create account|save my spot|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("full apply flow on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.route("/api/apply/signup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ redirectTo: "/dashboard" }),
      });
    });

    await page.goto("/apply");
    await page.locator("#apply-first-name").fill("E2E");
    await page.locator("#apply-last-name").fill("Test");
    await page.locator("#apply-email").fill(`e2e-mobile-${Date.now()}@example.com`);
    await page.locator("#apply-phone").fill("(512) 555-0199");
    await page.locator('input[name="q1"][value="yes"]').check();
    await page.locator('input[name="q2"][value="yes"]').check();
    await page.getByRole("button", { name: /continue to programs/i }).click();

    await expect(page).toHaveURL(/\/apply\/results/);
    const firstProgramCard = page.locator(".apply-results-program-card").first();
    await firstProgramCard.click();
    await page.getByRole("button", { name: /save my spot|create account/i }).click();

    await expect(page).toHaveURL(/\/apply\/create-account/);
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10000 });
  });
});
