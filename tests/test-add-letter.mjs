import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE ERROR: ' + m.text());
});

console.log('Loading /add-letter.html');
await page.goto('http://localhost:8765/add-letter.html', { waitUntil: 'networkidle' });

// Verify gate is showing
const gateVisible = await page.locator('#gate-screen').isVisible();
const formHidden = await page.locator('#author-form').isHidden();
console.log('gate visible:', gateVisible, '| form hidden:', formHidden);

// Wrong passphrase first
await page.fill('#gate-passphrase', 'wrong');
await page.click('#gate-submit');
const gateError = await page.locator('#gate-error').innerText().catch(() => '');
console.log('wrong passphrase error:', gateError);

// Right passphrase
await page.fill('#gate-passphrase', 'IowaLetters');
await page.click('#gate-submit');
await page.waitForTimeout(300);
const gateAfter = await page.locator('#gate-screen').isHidden();
const formAfter = await page.locator('#author-form').isVisible();
console.log('after unlock — gate hidden:', gateAfter, '| form visible:', formAfter);

// Verify gazetteer loaded into datalist
const placeOpts = await page.locator('#place-options option').count();
console.log('gazetteer options in datalist:', placeOpts);

// Fill the form with a test letter
console.log('\nFilling form...');
await page.fill('#title', 'TEST letter from Chattanooga, please delete');
await page.fill('#creator', 'Headless Browser');
await page.fill('#date', '1863-11-25');
await page.fill('#place', 'Chattanooga, Tennessee, United States');
await page.fill('#regiment', '16th Iowa Volunteer Infantry');
await page.fill('#company', 'Company C');
await page.fill('#addressee', 'Test Addressee, Linn County, Iowa');
await page.fill('#transcription', 'A test transcription written by a Playwright test agent.');

console.log('Submitting...');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
const status = await page.locator('#submit-status').innerText();
const successVisible = await page.locator('#author-success').isVisible().catch(() => false);
console.log('status:', status);
console.log('success block visible:', successVisible);

if (errors.length) {
  console.log('\nERRORS:');
  for (const e of errors) console.log('  ' + e);
}

await page.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\add-letter-test.png', fullPage: true });
console.log('\nScreenshot: C:\\Users\\mered\\Desktop\\iowa-demo\\add-letter-test.png');
await browser.close();
