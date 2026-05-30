const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const outDir = '/opt/cursor/artifacts';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pages = [
    '/dashboard/ai-tools/resume-rewriter',
    '/dashboard/ai-tools/resume-analysis',
    '/dashboard/ai-tools/cover-letter',
    '/dashboard/ai-tools/interview-practice',
    '/dashboard/ai-tools/interview-coach',
    '/dashboard/ai-tools/linkedin-headline',
    '/dashboard/ai-tools/linkedin-about',
    '/dashboard/ai-tools/salary-negotiation',
    '/dashboard/ai-tools/gap-analyzer',
    '/dashboard/ai-tools/job-match-scorer',
    '/dashboard/ai-tools/voice-interview',
    '/dashboard/ai-tools/skill-mapper',
  ];

  const historyHints = [
    'Recent saved runs',
    'Recent saved interview recordings',
    'Recent resume helper + rewriter runs',
    'Saved sessions',
    'Past Interview Sessions',
    'View all in history',
    'No saved runs yet for this tool',
    'Recent skill mapper lookups',
  ];

  const auditEmail = process.env.WAP_AUDIT_EMAIL?.trim();
  const auditPassword = process.env.WAP_AUDIT_PASSWORD;
  if (!auditEmail || !auditPassword) {
    throw new Error(
      'Missing audit login credentials. Set WAP_AUDIT_EMAIL and WAP_AUDIT_PASSWORD in the environment.',
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const base = 'https://www.workforceap.org';
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.fill('input[type="email"]', auditEmail);
  await page.fill('input[type="password"]', auditPassword);
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);

  const results = [];

  for (const route of pages) {
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1800);

    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();

    let observed = '';
    let pass = false;
    for (const hint of historyHints) {
      if (bodyText.toLowerCase().includes(hint.toLowerCase())) {
        observed = hint;
        pass = true;
        break;
      }
    }
    if (!pass) observed = 'No relevant history UI text detected';

    const safe = route.replaceAll('/', '_').replace(/^_+/, '');
    const screenshot = `${outDir}/audit_${safe}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });

    results.push({
      page: route,
      pass,
      observed,
      screenshot,
      finalUrl: page.url(),
    });
  }

  const reportPath = `${outDir}/ai_tools_history_audit.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ reportPath, results }, null, 2));

  await browser.close();
})();
