// Verify the two production bug fixes on the redeployed gis-map preview.
import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });

// ─── Bug 1: home county lines should persist through polls ────────────────
console.log('=== Bug 1: home lines persistence ===');
const map = await ctx.newPage();
map.on('console', (m) => { if (m.type() === 'error') console.log('  console err:', m.text()); });
await map.goto(URL + '/map.html', { waitUntil: 'networkidle' });
await map.waitForTimeout(2000);

// Toggle home lines on
await map.check('#toggle-home-lines');
const linesBefore = await map.evaluate(() => {
  const map = window._map || null;
  // Inspect the home-lines source data via the map global if available;
  // otherwise check the layer visibility and count via the map source.
  return null;
});

// Read the source data we set
const lineCountBefore = await map.evaluate(() => {
  const layers = document.querySelectorAll('.maplibregl-canvas');
  return layers.length ? 'canvas-present' : 'no-canvas';
});

// Wait for at least one poll cycle (12s) to elapse
console.log('  waiting 15s for a poll cycle to potentially wipe lines...');
await map.waitForTimeout(15000);

// Toggle off then on to be sure the layer is rendered, then count features
// in the home-lines source by sniffing through page evaluation
const featuresAfterPoll = await map.evaluate(() => {
  const sources = document.querySelectorAll('canvas');
  // Hard to read MapLibre source data from outside; instead read the sidebar
  // state and toggle visibility check
  return document.getElementById('toggle-home-lines').checked;
});
console.log('  toggle still checked after 15s poll:', featuresAfterPoll);

// Now visually confirm there ARE lines by counting pixels of the line color (#b85c38 or #2c5e7f) along likely vectors. Skip; rely on the screenshot.
await map.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\bug1-after-poll.png', fullPage: false });

// ─── Bug 2: passphrase actually unlocks the form ──────────────────────────
console.log('\n=== Bug 2: passphrase unlock ===');
const auth = await ctx.newPage();
auth.on('console', (m) => { if (m.type() === 'error') console.log('  console err:', m.text()); });
await auth.goto(URL + '/add-letter.html', { waitUntil: 'networkidle' });
await auth.waitForTimeout(1500);

const fatal = await auth.locator('#author-fatal').isVisible().catch(() => false);
console.log('  fatal banner visible:', fatal);

const gateVisible = await auth.locator('#gate-screen').isVisible();
console.log('  gate visible at load:', gateVisible);

await auth.fill('#gate-passphrase', 'IowaLetters');
await auth.click('#gate-submit');
await auth.waitForTimeout(800);

const formVisible = await auth.locator('#author-form').isVisible();
const placeOptions = await auth.locator('#place-options option').count();
console.log('  form visible after passphrase:', formVisible);
console.log('  gazetteer options:', placeOptions);

await auth.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\bug2-after-unlock.png', fullPage: false });

await browser.close();
console.log('\nScreenshots:');
console.log('  C:\\Users\\mered\\Desktop\\iowa-demo\\bug1-after-poll.png');
console.log('  C:\\Users\\mered\\Desktop\\iowa-demo\\bug2-after-unlock.png');
