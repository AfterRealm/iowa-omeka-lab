// Re-shoot the public-site screenshots from a fresh (unauthenticated) browser
// context so the admin overlay (Edit/Logout) doesn't appear.
import { chromium } from 'playwright';

const OUT = String.raw`C:\Users\mered\Desktop\iowa-demo\assets\img\omeka-screenshots`;

const shots = [
  { name: '10-public-home.png',        url: 'http://localhost:8090/s/iowa-letters' },
  { name: '11-public-items.png',       url: 'http://localhost:8090/s/iowa-letters/item' },
  { name: '12-public-item-detail.png', url: 'http://localhost:8090/s/iowa-letters/item/2' },
  { name: '13-public-item-set.png',    url: 'http://localhost:8090/s/iowa-letters/item-set/1' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

for (const s of shots) {
  console.log(`  ${s.name}  -> ${s.url}`);
  await page.goto(s.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}\\${s.name}`, fullPage: true });
}

await browser.close();
console.log('Done.');
