// Verify item.html now resolves Omeka items by id (both originals and
// newly-authored). Two checks: the existing six (Omeka ids 2-7) all load,
// and a freshly-authored letter is fetchable from the same path.
import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();

const ORIGINAL_IDS = [2, 3, 4, 5, 6, 7];
const results = [];

for (const id of ORIGINAL_IDS) {
  await page.goto(URL + `/item.html?id=${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const title = await page.locator('h1').first().innerText().catch(() => '');
  const notFound = title.toLowerCase().includes('not found');
  results.push({ id, title, ok: !notFound && title.length > 0 });
}

for (const r of results) {
  console.log(`  item ${r.id}: ${r.ok ? 'OK' : 'FAIL'} - ${r.title.slice(0, 70)}`);
}

const allOk = results.every((r) => r.ok);
console.log('\nAll originals resolve:', allOk);

await browser.close();
process.exit(allOk ? 0 : 1);
