import { chromium, devices } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://localhost:3005';
const email = 'mabrown040@gmail.com';
const password = 'Winner!22';

async function login(page) {
  await page.goto(`${baseURL}/login?redirectTo=${encodeURIComponent('/dashboard')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate(async ({ email, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wap-login-flow': 'client',
      },
      body: JSON.stringify({ email, password, redirectTo: '/dashboard', rememberMe: true }),
      credentials: 'include',
      redirect: 'manual',
    });
    return await res.json().catch(() => ({ ok: false }));
  }, { email, password });
  console.log('login result', result);
  await page.goto(`${baseURL}${result.redirectTo || '/dashboard'}`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('after login url', page.url(), 'title', await page.title());
  console.log('body snippet', (await page.locator('body').innerText().catch(() => '')).slice(0, 500).replace(/\s+/g, ' '));
}

async function snap(page, route, name) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('route', route, 'url', page.url(), 'title', await page.title());
  await page.screenshot({ path: `tmp/${name}.png`, fullPage: true });
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await desktop.newPage();
await login(page);
for (const [route, name] of [
  ['/admin', 'qa-admin-desktop'],
  ['/admin/applications', 'qa-admin-applications-desktop'],
  ['/admin/members', 'qa-admin-members-desktop'],
]) {
  await snap(page, route, name);
}

const mobile = await browser.newContext({ ...devices['iPhone 13'] });
const mpage = await mobile.newPage();
await login(mpage);
for (const [route, name] of [
  ['/admin', 'qa-admin-mobile'],
  ['/admin/applications', 'qa-admin-applications-mobile'],
  ['/admin/members', 'qa-admin-members-mobile'],
]) {
  await snap(mpage, route, name);
}

await browser.close();
