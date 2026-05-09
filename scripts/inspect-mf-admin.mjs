import { chromium } from 'playwright';

const url = 'http://localhost:5407/';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const consoleErrors = [];
  const failed = [];

  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}\n${err.stack || ''}`));
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('requestfailed', req => failed.push(`FAILED: ${req.url()} - ${req.failure()?.errorText}`));
  page.on('response', res => {
    if (res.status() >= 400) failed.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('GOTO ERROR:', e.message);
  }
  // wait extra for client-side errors to show
  await page.waitForTimeout(2000);

  const rootHTML = await page.evaluate(() => document.getElementById('root')?.innerHTML || '<root no encontrado>');
  console.log('=== ROOT HTML (first 300 chars) ===');
  console.log(rootHTML.slice(0, 300));
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log(e));
  console.log('\n=== FAILED REQUESTS ===');
  failed.forEach(e => console.log(e));

  await browser.close();
})();

