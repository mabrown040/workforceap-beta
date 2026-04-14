import { chromium, devices } from 'playwright';
const baseURL = 'http://localhost:3005';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.goto(`${baseURL}/login?redirectTo=%2Fdashboard`, { waitUntil: 'domcontentloaded' });
const result = await page.evaluate(async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wap-login-flow': 'client' },
    body: JSON.stringify({ email: 'mabrown040@gmail.com', password: 'Winner!22', redirectTo: '/dashboard', rememberMe: true }),
    credentials: 'include',
    redirect: 'manual',
  });
  return res.json();
});
await page.goto(`${baseURL}${result.redirectTo}`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /open menu/i }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp/qa-admin-mobile-drawer.png' });
await browser.close();
