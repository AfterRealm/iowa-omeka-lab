import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL + '/map.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const tag = await page.locator('[data-build-tag]').first().innerText();
console.log('build tag text:', JSON.stringify(tag));

// Post a community letter via the author form so the gold marker appears
const auth = await ctx.newPage();
await auth.goto(URL + '/add-letter.html', { waitUntil: 'networkidle' });
await auth.waitForTimeout(800);
await auth.fill('#gate-passphrase', 'IowaLetters');
await auth.click('#gate-submit');
await auth.waitForTimeout(400);
await auth.fill('#title', 'Test community contribution');
await auth.fill('#creator', 'Test Contributor');
await auth.fill('#date', '1863-04-10');
await auth.fill('#place', 'Chattanooga, Tennessee, United States');
await auth.fill('#transcription', 'Verifying the community marker style.');
await auth.click('button[type="submit"]');
await auth.waitForTimeout(2500);
const status = await auth.locator('#submit-status').innerText();
console.log('submit:', status);
const m = status.match(/item #(\d+)/);
const id = m ? Number(m[1]) : null;

// Wait for the map to pick it up
await page.waitForTimeout(15000);
const sidebarCount = await page.locator('#letter-list li').count();
console.log('sidebar after poll:', sidebarCount);

await page.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\v020-preview.png', fullPage: false });

// Cleanup
if (id) {
  const r = await fetch(`http://localhost:8090/api/items/${id}?key_identity=e31f050476349719dcf36c94f20e7b23&key_credential=6b230fd6e335811cea19f385bdfc82e7`, { method: 'DELETE' });
  console.log('cleanup DELETE:', r.status);
}

await browser.close();
console.log('screenshot: C:\\Users\\mered\\Desktop\\iowa-demo\\v020-preview.png');
