import { test, expect } from '@playwright/test';
import { hasProdE2ECredentials } from './auth-helpers';

const FLATTENED_RESUME = `Michael Brown II
Experience Founding Account Executive | Contango IT | Remote
Exceeded quota in ramp, Q1 2025, and Q2 2025 through targeted prospecting and disciplined pipeline management.
Education Master of Business Administration | Abilene Christian University`;

test.describe('AI tool flow — Resume Analysis', () => {
  test.beforeEach(() => {
    test.skip(!hasProdE2ECredentials(), 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD');
  });

  test('headline score uses API composite instead of parsed narrative score', async ({ context, page, baseURL }) => {
    await page.route('/api/ai/resume-strength', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          output: `OVERALL SCORE: 19%

STRENGTHS:
• Strong quota ownership.

PRIORITY IMPROVEMENTS:
• Restore section boundaries.

QUICK WINS:
• Add clearer headings.`,
          composite: 77,
          pillars: {
            structural: { score: 77, label: 'Structure & ATS basics' },
            onetCoverage: null,
            marketCoverage: null,
          },
          structural: {
            composite: 77,
            breakdown: {
              structure: { score: 80, notes: [] },
              quantification: { score: 75, notes: [] },
              actionVerbs: { score: 78, notes: [] },
              bulletLength: { score: 74, notes: [] },
              contact: { score: 79, notes: [] },
            },
          },
          occupations: [],
          onetCoverage: [],
          marketCoverage: [],
        }),
      });
    });

    const email = process.env.E2E_MEMBER_EMAIL?.trim();
    const password = process.env.E2E_MEMBER_PASSWORD?.trim();
    if (!email || !password) test.fail(true, 'Missing E2E member credentials');

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').fill(email ?? '');
    await page.locator('#password').fill(password ?? '');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login([?#]|$)/, { timeout: 60000 });

    await page.goto('/dashboard/ai-tools/resume-analysis');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /resume analysis/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#resume-strength-body').fill(FLATTENED_RESUME);
    await page.getByRole('button', { name: /analyze resume/i }).click();

    await expect(page.getByText('77%', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/flattened headings or bullets during text extraction/i)).toBeVisible();
    await expect(page.locator('.resume-rewriter-output-content')).toContainText('OVERALL SCORE: 19%');
  });
});
