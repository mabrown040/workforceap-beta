import { test, expect } from "@playwright/test";
import { hasProdE2ECredentials, loginMemberPortal } from "./auth-helpers";

/** Mobile viewport for low-income, mobile-first ICP testing */
const MOBILE_VIEWPORT = { width: 375, height: 667 };

/** Mocked resume rewriter response */
const MOCK_RESUME_OUTPUT = `E2E Test Output
• Led cross-functional team of 5 engineers to deliver project 20% under budget
• Reduced ticket response time by 40% through implementation of new triage workflow
• Increased customer satisfaction scores from 72% to 91% in 6 months`;

test.describe("AI tool flow — Resume Rewriter", () => {
  test.beforeEach(() => {
    test.skip(!hasProdE2ECredentials(), "Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD");
  });

  test("member can navigate to AI toolkit and see resume rewriter", async ({ page }) => {
    await loginMemberPortal(page);
    await page.goto("/dashboard/ai-tools");
    await expect(page.getByRole("heading", { name: /career toolkit|ai toolkit/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/resume rewriter/i)).toBeVisible();
    const resumeLink = page.getByRole("link", { name: /resume rewriter/i }).first();
    await resumeLink.click();
    await expect(page).toHaveURL(/\/dashboard\/ai-tools\/resume-rewriter/);
    await expect(page.getByRole("heading", { name: /resume rewriter/i })).toBeVisible({ timeout: 15000 });
  });

  test("resume rewriter form submits and shows mocked output", async ({ page }) => {
    await page.route("/api/ai/resume-rewriter", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ output: MOCK_RESUME_OUTPUT }),
      });
    });

    await loginMemberPortal(page);
    await page.goto("/dashboard/ai-tools/resume-rewriter");
    await expect(page.locator("#job-target")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#resume")).toBeVisible();

    await page.locator("#job-target").fill("IT Support Specialist");
    await page.locator("#target-salary").selectOption("$40,000 - $60,000");
    await page.locator("#target-location").fill("Austin, TX");
    await page.locator("#resume").fill("Previous experience in customer support. Handled tickets and improved response times.");

    await page.getByRole("button", { name: /rewrite resume/i }).click();
    await expect(page.locator(".resume-rewriter-output-content")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".resume-rewriter-output-content")).toContainText("E2E Test Output");
  });

  test("resume rewriter works on mobile viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    await page.route("/api/ai/resume-rewriter", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ output: MOCK_RESUME_OUTPUT }),
      });
    });

    await loginMemberPortal(page);
    await page.goto("/dashboard/ai-tools/resume-rewriter");
    await expect(page.locator("#job-target")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#resume")).toBeVisible();

    await page.locator("#job-target").fill("Data Analyst");
    await page.locator("#resume").fill("Experience with Excel and SQL. Created reports for management.");
    await page.getByRole("button", { name: /rewrite resume/i }).click();
    await expect(page.locator(".resume-rewriter-output-content")).toBeVisible({ timeout: 15000 });
  });
});
