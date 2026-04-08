import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
/** Staging/prod URL — do not boot `npm run dev`. */
const isRemoteBase =
  /^https?:\/\//i.test(baseURL) && !/localhost|127\.0\.0\.1/i.test(baseURL);

type TraceSetting =
  | 'off'
  | 'on'
  | 'on-first-retry'
  | 'on-all-retries'
  | 'retain-on-failure'
  | 'retain-on-first-failure'
  | 'retain-on-failure-and-retries';

function parseTraceSetting(raw: string | undefined): TraceSetting | undefined {
  if (!raw) return undefined;
  const v = raw.trim() as TraceSetting;
  switch (v) {
    case 'off':
    case 'on':
    case 'on-first-retry':
    case 'on-all-retries':
    case 'retain-on-failure':
    case 'retain-on-first-failure':
    case 'retain-on-failure-and-retries':
      return v;
    default:
      return undefined;
  }
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: process.env.PLAYWRIGHT_TRACE ?? 'on-first-retry',
    video: process.env.PLAYWRIGHT_VIDEO ? 'on' : 'off',
    screenshot: process.env.PLAYWRIGHT_SCREENSHOT ? 'on' : 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer:
    process.env.CI || isRemoteBase
      ? undefined
      : {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
        },
});
