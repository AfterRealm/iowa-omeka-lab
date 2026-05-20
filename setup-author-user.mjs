// Provision the iowa-letters-author user + a REST API key for the public
// authoring UI of the Iowa Letters demo.
//
//   - User created via Omeka REST API (admin key).
//   - API key generated via Omeka admin UI (REST doesn't expose key creation),
//     using Playwright to drive the user-edit page #edit-keys section.
//
// The Author role's blast radius is bounded: they can create new items and
// cannot edit others' work, cannot reach global admin settings, cannot delete.
// The generated KEY_ID + KEY_CRED end up in author-credentials.env (gitignored)
// and are then baked into the static add-letter.html behind the IowaLetters
// passphrase gate.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:8090';
const ADMIN_EMAIL = 'meredithsealycasa@gmail.com';
const ADMIN_PASSWORD = 'IowaLab2026!';
const ADMIN_KEY_ID = 'e31f050476349719dcf36c94f20e7b23';
const ADMIN_KEY_CRED = '6b230fd6e335811cea19f385bdfc82e7';

const AUTHOR_NAME = 'Iowa Letters Author';
const AUTHOR_EMAIL = 'iowa-letters-author@example.com';
const AUTHOR_ROLE = 'author';
const KEY_LABEL = 'iowa-letters-public-author-form';
const OUT_ENV = 'C:\\Users\\mered\\Desktop\\omeka-lab\\author-credentials.env';

const log = (m) => console.log(`[setup-author-user] ${m}`);
const restAuth = `key_identity=${ADMIN_KEY_ID}&key_credential=${ADMIN_KEY_CRED}`;

async function rest(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}/api${path}?${restAuth}`, opts);
  const txt = await r.text();
  let json; try { json = txt ? JSON.parse(txt) : {}; } catch { json = { _raw: txt }; }
  return { status: r.status, json };
}

log('Looking up existing author user via REST...');
const list = await rest('GET', '/users');
let userId = (list.json.find?.(u => u['o:email'] === AUTHOR_EMAIL) || {})['o:id'];

if (userId) {
  log(`Author user already exists: id=${userId}`);
} else {
  log('Creating author user via REST...');
  const create = await rest('POST', '/users', {
    'o:email': AUTHOR_EMAIL,
    'o:name': AUTHOR_NAME,
    'o:role': AUTHOR_ROLE,
    'o:is_active': true,
  });
  if (create.status !== 200) {
    throw new Error(`User create failed: ${JSON.stringify(create.json)}`);
  }
  userId = create.json['o:id'];
  log(`Created author user id=${userId}`);
}

log('Generating API key via admin UI (REST does not expose key creation)...');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[name="email"]', ADMIN_EMAIL);
await page.fill('input[name="password"]', ADMIN_PASSWORD);
await page.click('button[type="submit"], input[type="submit"]');
await page.waitForLoadState('networkidle');
log('Admin login OK.');

const editUrl = `${BASE}/admin/user/${userId}/edit`;
await page.goto(editUrl, { waitUntil: 'networkidle' });
await page.click('a[href="#edit-keys"]').catch(() => {});
await page.waitForTimeout(200);

// Delete any pre-existing keys with our label so we can capture a fresh
// credential. The credential is shown ONCE only — if a prior run already
// created one, we have to regenerate.
log('Checking for pre-existing keys with our label...');
const deleteBoxes = await page.$$(`tr:has-text("${KEY_LABEL}") input[type="checkbox"]`);
if (deleteBoxes.length > 0) {
  log(`Found ${deleteBoxes.length} existing key(s) — marking for delete.`);
  for (const cb of deleteBoxes) await cb.check();
  await page.locator('button[type="submit"]:has-text("Save"), input[type="submit"][value*="Save" i]').first().click();
  await page.waitForLoadState('networkidle');
  await page.goto(editUrl, { waitUntil: 'networkidle' });
  await page.click('a[href="#edit-keys"]').catch(() => {});
  await page.waitForTimeout(200);
}

log(`Filling new-key-label with "${KEY_LABEL}"...`);
await page.fill('input[name="edit-keys[new-key-label]"]', KEY_LABEL);

log('Saving user — credential will be shown ONCE in the post-save reload...');
await page.locator('button[type="submit"]:has-text("Save"), input[type="submit"][value*="Save" i]').first().click();
await page.waitForLoadState('networkidle');

// After save, Omeka renders a flash message at the top of the page in this
// exact form (verified empirically):
//
//   API key successfully created.
//   Here is your key ID and credential for access to the API.
//   WARNING: "key_credential" will be unretrievable after you navigate away from this page.
//   key_identity=<32-char base62>
//   key_credential=<32-char base62>
//
// Parse it.
const bodyText = await page.locator('body').innerText();
const idMatch = bodyText.match(/key_identity=([A-Za-z0-9]{32})/);
const credMatch = bodyText.match(/key_credential=([A-Za-z0-9]{32})/);
if (!idMatch || !credMatch) {
  log('Flash message not found. Body snippet:');
  log(bodyText.slice(0, 2000));
  throw new Error('Failed to extract API key identity + credential from flash message.');
}
const KEY_ID = idMatch[1];
const KEY_CRED = credMatch[1];

log(`KEY_ID   = ${KEY_ID}`);
log(`KEY_CRED = ${KEY_CRED}`);

writeFileSync(
  OUT_ENV,
  [
    '# Omeka S REST API key for the iowa-letters-author user.',
    '# Generated by setup-author-user.mjs.',
    '# Embedded in add-letter.html behind the IowaLetters passphrase gate.',
    '# User role is "author" — blast radius limited to creating new items.',
    `KEY_ID=${KEY_ID}`,
    `KEY_CRED=${KEY_CRED}`,
    `USER_ID=${userId}`,
    '',
  ].join('\n'),
);
log(`Wrote ${OUT_ENV}`);

// Sanity check: try a GET /me with the new key
log('Sanity check: GET /api/users/me with the new key...');
const me = await fetch(`${BASE}/api/users/${userId}?key_identity=${KEY_ID}&key_credential=${KEY_CRED}`);
log(`  status=${me.status}`);

await browser.close();
log('Done.');
