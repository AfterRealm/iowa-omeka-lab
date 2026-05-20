import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();

console.log('=== items.html ===');
await page.goto(URL + '/items.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const count = await page.locator('#item-list .item-card').count();
console.log('  item cards rendered:', count);
const sample = await page.locator('#item-list .card-title a').first().innerText().catch(() => '');
console.log('  first card title:', sample);

console.log('\n=== about-this-build.html ===');
await page.goto(URL + '/about-this-build.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const h2s = await page.locator('main h2').allInnerTexts();
console.log('  H2 sections:');
for (const h of h2s) console.log('    -', h);

console.log('\n=== build tag on items page ===');
await page.goto(URL + '/items.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const tag = await page.locator('[data-build-tag]').first().innerText();
console.log('  build tag:', tag);

await browser.close();
