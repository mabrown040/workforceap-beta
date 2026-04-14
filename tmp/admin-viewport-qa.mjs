import { chromium, devices } from 'playwright';
const baseURL = 'http://localhost:3005';
const email = 'mabrown040@gmail.com';
const password = 'Winner!22';

async function login(page) {
  await page.goto(`${baseURL}/login?redirectTo=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async ({ email, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wap-login-flow': 'client' },
      body: JSON.stringify({ email, password, redirectTo: '/dashboard', rememberMe: true }),
      credentials: 'include',
      redirect: 'manual',
    });
    return res.json();
  }, { email, password });
  await page.goto(`${baseURL}${result.redirectTo}`, { waitUntil: 'networkidle' });
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const dp = await desktop.newPage();
await login(dp);
await dp.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' });
await dp.screenshot({ path: 'tmp/qa-admin-desktop-viewport.png' });
await dp.goto(`${baseURL}/admin/members`, { waitUntil: 'networkidle' });
await dp.screenshot({ path: 'tmp/qa-admin-members-desktop-viewport.png' });

const mobile = await browser.newContext({ ...devices['iPhone 13'] });
const mp = await mobile.newPage();
await login(mp);
await mp.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' });
await mp.screenshot({ path: 'tmp/qa-admin-mobile-viewport.png' });
await mp.goto(`${baseURL}/admin/members`, { waitUntil: 'networkidle' });
await mp.screenshot({ path: 'tmp/qa-admin-members-mobile-viewport.png' });

await browser.close();
