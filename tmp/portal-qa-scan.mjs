import { chromium, devices } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const email = 'mabrown040@gmail.com';
const password = 'Winner!22';

async function tryLogin(page) {
  const res = await page.goto(`${baseURL}/login?redirectTo=${encodeURIComponent('/dashboard')}`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('login status', res?.status(), 'url', page.url(), 'title', await page.title());
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('login body snippet', bodyText.slice(0, 400).replace(/\s+/g, ' '));
  const emailInput = page.locator('#email');
  if (await emailInput.count()) {
    await emailInput.fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /authenticate access/i }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    console.log('after submit', page.url(), await page.title());
    console.log('body snippet after submit', (await page.locator('body').innerText().catch(() => '')).slice(0, 400).replace(/\s+/g, ' '));
  }
}

async function scan(page, route, name) {
  const res = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('route', route, 'status', res?.status(), 'url', page.url(), 'title', await page.title());
  await page.screenshot({ path: `tmp/${name}.png`, fullPage: true });
  const navText = await page.locator('body').innerText().catch(() => '');
  console.log('snippet', name, navText.slice(0, 500).replace(/\s+/g, ' '));
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await desktop.newPage();
await tryLogin(page);
for (const [route, name] of [
  ['/dashboard', 'qa-dashboard-desktop'],
  ['/dashboard/training', 'qa-training-desktop'],
  ['/dashboard/messages', 'qa-messages-desktop'],
  ['/dashboard/profile', 'qa-profile-desktop'],
  ['/dashboard/settings', 'qa-settings-desktop'],
]) {
  await scan(page, route, name);
}

const mobile = await browser.newContext({ ...devices['iPhone 13'] });
const mpage = await mobile.newPage();
await tryLogin(mpage);
for (const [route, name] of [
  ['/dashboard', 'qa-dashboard-mobile'],
  ['/dashboard/training', 'qa-training-mobile'],
  ['/dashboard/messages', 'qa-messages-mobile'],
  ['/dashboard/profile', 'qa-profile-mobile'],
  ['/dashboard/settings', 'qa-settings-mobile'],
]) {
  await scan(mpage, route, name);
}
await browser.close();
