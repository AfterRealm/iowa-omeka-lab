// Smoke test the deployed Netlify branch preview end-to-end.
import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE ERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

console.log('Loading', URL + '/map.html');
await page.goto(URL + '/map.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const sidebar = await page.locator('#letter-list li').count();
const canvas = await page.locator('.maplibregl-canvas').count();
console.log('sidebar:', sidebar, '| canvas:', canvas);
await page.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\netlify-preview.png', fullPage: false });

if (errs.length) { console.log('ERRORS:'); for (const e of errs) console.log('  ' + e); }
else console.log('No errors.');

await browser.close();
console.log('Screenshot at netlify-preview.png');
