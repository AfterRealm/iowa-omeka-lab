// Integration test: open the map, count initial pins, submit a new letter
// via add-letter.html in a second tab, wait for the map's poll loop to pick
// it up, verify the new pin landed.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });

const map = await ctx.newPage();
map.on('pageerror', (e) => console.log('MAP PAGE ERROR:', e.message));
map.on('console', (m) => { if (m.type() === 'error') console.log('MAP CONSOLE ERROR:', m.text()); });

console.log('1. Open map page');
await map.goto('http://localhost:8765/map.html', { waitUntil: 'networkidle' });
await map.waitForTimeout(4000); // let the first poll complete

const initialCount = await map.locator('#letter-list li').count();
console.log('   sidebar items after first poll:', initialCount);

console.log('\n2. Open add-letter page in second tab');
const auth = await ctx.newPage();
await auth.goto('http://localhost:8765/add-letter.html', { waitUntil: 'networkidle' });
await auth.fill('#gate-passphrase', 'IowaLetters');
await auth.click('#gate-submit');
await auth.waitForTimeout(300);

const placeValue = 'Murfreesboro, Tennessee, United States';
await auth.fill('#title', 'LIVE-POLL test letter');
await auth.fill('#creator', 'Headless Tester');
await auth.fill('#date', '1862-12-31');
await auth.fill('#place', placeValue);
await auth.fill('#addressee', 'Home, Polk County, Iowa');
await auth.fill('#transcription', 'A test letter to verify the live-poll path.');

console.log('   submitting...');
await auth.click('button[type="submit"]');
await auth.waitForTimeout(2500);
const submitStatus = await auth.locator('#submit-status').innerText();
console.log('   status:', submitStatus);

const itemIdMatch = submitStatus.match(/item #(\d+)/);
const newItemId = itemIdMatch ? Number(itemIdMatch[1]) : null;
console.log('   new omeka item id:', newItemId);

console.log('\n3. Wait for map poll loop to pick up the new letter (up to 25s)');
const start = Date.now();
let found = false;
while (Date.now() - start < 25000) {
  const ids = await map.evaluate(() =>
    Array.from(document.querySelectorAll('#letter-list button')).map((b) => Number(b.dataset.id))
  );
  if (ids.includes(newItemId)) {
    found = true;
    console.log(`   FOUND on map after ${Math.round((Date.now() - start) / 1000)}s`);
    break;
  }
  await map.waitForTimeout(1500);
}

if (!found) {
  console.log('   !! new letter never appeared on map within 25s');
}

await map.waitForTimeout(1500); // let flash animation settle
await map.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\live-poll-test.png', fullPage: false });

console.log('\nCleanup: deleting test item via admin...');
const r = await fetch(`http://localhost:8090/api/items/${newItemId}?key_identity=e31f050476349719dcf36c94f20e7b23&key_credential=6b230fd6e335811cea19f385bdfc82e7`, { method: 'DELETE' });
console.log('   DELETE status:', r.status);

await browser.close();
console.log('\nResult:', found ? 'PASS' : 'FAIL');
process.exit(found ? 0 : 1);
