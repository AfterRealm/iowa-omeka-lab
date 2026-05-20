import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

// Savannah is Omeka id 6
await page.goto(URL + '/map.html?focus=6', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const title = await page.locator('.popup-title').first().innerText().catch(() => '(no popup)');
console.log('focus=6 opened popup:', title);

await browser.close();
