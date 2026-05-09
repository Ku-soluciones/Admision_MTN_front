import { chromium } from 'playwright';

const PORTS = {
  'mf-admissions': 5201,
  'mf-guardian': 5202,
  'mf-student': 5203,
  'mf-evaluations': 5204,
  'mf-interviews': 5205,
  'mf-admin': 5407,  // we started this one on 5407
  'mf-reports': 5207,
  'mf-coordinator': 5208,
};

const browser = await chromium.launch();

for (const [mf, port] of Object.entries(PORTS)) {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let alive = true;
  try {
    const res = await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 8000 });
    if (!res || res.status() >= 400) alive = false;
  } catch {
    alive = false;
  }
  if (!alive) {
    console.log(`${mf.padEnd(18)} (${port}): NOT RUNNING`);
    await page.close();
    continue;
  }
  await page.waitForTimeout(800);
  const root = await page.evaluate(() => document.getElementById('root')?.innerHTML?.length || 0);
  const hasError = errors.length > 0;
  const status = hasError ? `❌ ${errors[0].slice(0, 100)}` : (root > 100 ? '✅ render OK' : '⚠️  empty root');
  console.log(`${mf.padEnd(18)} (${port}): ${status}`);
  await page.close();
}

await browser.close();

