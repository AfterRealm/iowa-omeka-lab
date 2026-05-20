// Run an axe-core WCAG 2.2 AA audit against every page of the iowa-demo
// build (focused on the new map + add-letter + methodology surfaces).
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const PAGES = [
  '/',
  '/items.html',
  '/map.html',
  '/add-letter.html',
  '/map-methodology.html',
  '/authoring-pipeline.html',
  '/methodology.html',
  '/about-this-build.html',
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

let totalViolations = 0;

for (const path of PAGES) {
  const url = `http://localhost:8765${path}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // For the author page we need to unlock the gate so the form is in the DOM
  if (path === '/add-letter.html') {
    await page.fill('#gate-passphrase', 'IowaLetters');
    await page.click('#gate-submit');
    await page.waitForTimeout(500);
  }

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const violations = results.violations;
  totalViolations += violations.length;

  console.log(`\n=== ${path} ===`);
  if (!violations.length) {
    console.log('  PASS — no violations');
    continue;
  }
  for (const v of violations) {
    console.log(`  [${v.impact || 'n/a'}] ${v.id}: ${v.help}`);
    console.log(`    ${v.helpUrl}`);
    for (const n of v.nodes.slice(0, 3)) {
      const target = (n.target && n.target[0]) || '';
      console.log(`    → ${target}`);
      if (n.failureSummary) {
        for (const line of n.failureSummary.split('\n').slice(0, 2)) {
          console.log(`      ${line}`);
        }
      }
    }
  }
}

await browser.close();
console.log(`\nTOTAL VIOLATIONS: ${totalViolations}`);
process.exit(totalViolations > 0 ? 1 : 0);
