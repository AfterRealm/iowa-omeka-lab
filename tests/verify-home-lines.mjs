// Directly inspect the home-lines source to confirm it stays populated
// across polls.
import { chromium } from 'playwright';
const URL = 'https://gis-map--iowa-letters.netlify.app';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });

await page.goto(URL + '/map.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // initial render

// MapLibre stashes the map instance on the maplibregl global container; we
// can reach it via the canvas element's __mapboxgl_canvas reference, but
// safer to wire it through a debug hook. Instead, we'll inspect via a
// MutationObserver-free path: count vector features by sampling.
async function homeLineCount() {
  return await page.evaluate(() => {
    // Find the MapLibre map instance via its container element. MapLibre
    // attaches the Map object as a property on the container during
    // construction; we look for any property whose value is an object with
    // a getSource method.
    const container = document.getElementById('map');
    if (!container) return -1;
    // MapLibre stores the map at container.__mapboxgl_canvas (older) and
    // through getMap() (newer). Easiest: maplibregl keeps a reference on
    // window if we set one. The cleanest reliable way without modifying the
    // app code is to inspect _children for a known canvas + use the
    // global instance map _instances tracker if available.
    // Fall back to reading the layer's _source data via MapLibre's internal
    // structures (brittle but works on 4.x):
    const map = window.__map_ref || null;
    return map && map.getSource ? map.getSource('home-lines')._data.features.length : -2;
  });
}

console.log('home-line count before first poll:', await homeLineCount());

await page.waitForTimeout(15000); // a poll has now run
console.log('home-line count after first poll: ', await homeLineCount());

await page.waitForTimeout(13000); // a second poll
console.log('home-line count after second poll:', await homeLineCount());

await browser.close();
