import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE ERROR: ' + m.text());
  else if (m.type() === 'warning') errors.push('CONSOLE WARN: ' + m.text());
});
console.log('Loading http://localhost:8765/map.html');
await page.goto('http://localhost:8765/map.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000); // give MapLibre time to render

// Check that key DOM is present
const sidebarItems = await page.locator('#letter-list li').count();
const mapCanvas = await page.locator('.maplibregl-canvas').count();
const timelineMin = await page.locator('#timeline-slider').getAttribute('min');
const timelineMax = await page.locator('#timeline-slider').getAttribute('max');
const readout = await page.locator('#timeline-readout').innerText();

console.log('sidebar items:', sidebarItems);
console.log('map canvas elements:', mapCanvas);
console.log('timeline range:', timelineMin, '..', timelineMax);
console.log('timeline readout:', readout);

if (errors.length) {
  console.log('\nERRORS / WARNINGS:');
  for (const e of errors) console.log('  ' + e);
} else {
  console.log('\nNo console errors.');
}

await page.screenshot({ path: 'C:\\Users\\mered\\Desktop\\iowa-demo\\map-test-screenshot.png', fullPage: true });
console.log('\nScreenshot: C:\\Users\\mered\\Desktop\\iowa-demo\\map-test-screenshot.png');
await browser.close();
