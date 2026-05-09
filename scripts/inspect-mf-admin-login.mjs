import { chromium } from 'playwright';

const url = 'http://localhost:5407/#/login';

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const root = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log('=== ROOT (first 500) ===');
  console.log(root.slice(0, 500));
  console.log('\n=== PAGE ERRORS ===');
  errors.forEach(e => console.log(e));
  // detectar si hay un formulario de login
  const hasLoginForm = await page.evaluate(() => {
    return !!document.querySelector('form input[type="email"], form input[type="password"], form button[type="submit"]');
  });
  console.log('\nLogin form detected:', hasLoginForm);
  await browser.close();
})();

