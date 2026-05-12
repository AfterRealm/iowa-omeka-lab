// Take screenshots of the Omeka S 4.1.1 admin + public site
// for embedding in the prototype's methodology page.
import { chromium } from 'playwright';

const ADMIN_URL = 'http://localhost:8090/admin';
const PUBLIC_URL = 'http://localhost:8090/s/iowa-letters';
const EMAIL = 'meredithsealycasa@gmail.com';
const PASSWORD = 'IowaLab2026!';
const OUT = String.raw`C:\Users\mered\Desktop\iowa-demo\assets\img\omeka-screenshots`;

const shots = [
  // Admin (requires login) — these come first, so login persists
  { name: '01-admin-dashboard.png',         url: 'http://localhost:8090/admin', wait: 'h1' },
  { name: '02-admin-items.png',             url: 'http://localhost:8090/admin/item', wait: 'h1' },
  { name: '03-admin-item-detail.png',       url: 'http://localhost:8090/admin/item/2', wait: 'h1' },
  { name: '04-admin-item-sets.png',         url: 'http://localhost:8090/admin/item-set', wait: 'h1' },
  { name: '05-admin-resource-templates.png',url: 'http://localhost:8090/admin/resource-template', wait: 'h1' },
  { name: '06-admin-template-detail.png',   url: 'http://localhost:8090/admin/resource-template/2', wait: 'h1' },
  { name: '07-admin-sites.png',             url: 'http://localhost:8090/admin/site', wait: 'h1' },
  { name: '08-admin-site-pages.png',        url: 'http://localhost:8090/admin/site/s/iowa-letters/page', wait: 'h1' },
  // Public
  { name: '10-public-home.png',             url: 'http://localhost:8090/s/iowa-letters', wait: 'main' },
  { name: '11-public-items.png',            url: 'http://localhost:8090/s/iowa-letters/item', wait: 'main' },
  { name: '12-public-item-detail.png',      url: 'http://localhost:8090/s/iowa-letters/item/2', wait: 'main' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

// Log in once
console.log('Logging in to admin...');
await page.goto('http://localhost:8090/login', { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"], input[type="submit"]');
await page.waitForLoadState('networkidle');
console.log('Logged in. Current URL:', page.url());

for (const s of shots) {
  try {
    console.log(`  ${s.name}  -> ${s.url}`);
    await page.goto(s.url, { waitUntil: 'networkidle' });
    if (s.wait) await page.waitForSelector(s.wait, { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}\\${s.name}`, fullPage: true });
  } catch (e) {
    console.log(`    ERROR: ${e.message}`);
  }
}

await browser.close();
console.log('\nDone. Screenshots in', OUT);
