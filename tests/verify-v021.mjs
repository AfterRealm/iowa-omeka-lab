import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

await page.goto(URL + '/add-letter.html', { waitUntil: 'networkidle' });
await page.fill('#gate-passphrase', 'IowaLetters');
await page.click('#gate-submit');
await page.waitForTimeout(400);

const opts = await page.locator('#place-options option').all();
const values = [];
for (const o of opts) values.push(await o.getAttribute('value'));
console.log('first 10 datalist options (alphabetical by state then place):');
for (const v of values.slice(0, 10)) console.log('  ' + v);

await page.goto(URL + '/item.html?id=2', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const href = await page.locator('a[href^="/map.html?focus"]').first().getAttribute('href').catch(() => '');
console.log('\nitem.html "Open on the map" href:', href);

const tag = await page.locator('[data-build-tag]').first().innerText();
console.log('build tag:', tag);

await browser.close();
