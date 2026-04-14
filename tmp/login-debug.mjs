import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3005/login?redirectTo=%2Fdashboard', { waitUntil: 'networkidle' });
await page.fill('#email', 'mabrown040@gmail.com');
await page.fill('#password', 'Winner!22');
const result = await page.evaluate(async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mabrown040@gmail.com', password: 'Winner!22', redirectTo: '/dashboard', rememberMe: true }),
    credentials: 'include',
    redirect: 'manual',
  });
  let body = null;
  try { body = await res.text(); } catch {}
  return {
    status: res.status,
    type: res.type,
    redirected: res.redirected,
    url: res.url,
    location: res.headers.get('Location'),
    body: body?.slice(0, 200),
    cookies: document.cookie,
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
