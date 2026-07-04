// tests/bfcache.mjs
// Spike: does the home intro state survive bfcache (browser back)?
// If yes -> drop the pageshow reload in src/main.js:54-60.
// If no  -> keep + document why.

import { chromium } from '/home/yqecea/.nvm/versions/node/v24.12.0/lib/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let loadEvents = 0;
page.on('load', () => loadEvents++);

// 1. Load home, wait for intro to mount, click to dismiss
await page.goto('http://127.0.0.1:5555/index.html', { waitUntil: 'networkidle' });
await page.waitForSelector('.load.hometoggler', { timeout: 10000 });
await page.waitForTimeout(2000);

// Mark intro as dismissed (whatever the runtime actually sets)
await page.evaluate(() => {
  document.body.classList.add('intro-dismissed');
});
const initialLoadEvents = loadEvents;

// 2. Navigate to about directly (avoid menu interaction)
await page.goto('http://127.0.0.1:5555/pages/about.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const afterNavLoadEvents = loadEvents;

// 3. Navigate back (bfcache restore)
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const afterBackLoadEvents = loadEvents;

// 4. Check if bfcache actually works (event.persisted should be true if so)
const bfcacheWorked = await page.evaluate(() => {
  return new Promise((resolve) => {
    window.addEventListener('pageshow', (e) => {
      resolve({ persisted: e.persisted, ts: Date.now() });
    }, { once: true });
    setTimeout(() => resolve({ persisted: null, timeout: true }), 3000);
  });
});

// 5. Verify
const fullReload = afterBackLoadEvents > afterNavLoadEvents;
const stateSurvives = await page.evaluate(() =>
  document.body.classList.contains('intro-dismissed')
);

await browser.close();

console.log(`Initial load: ${initialLoadEvents}`);
console.log(`After nav: ${afterNavLoadEvents}`);
console.log(`After back: ${afterBackLoadEvents}`);
console.log(`Full reload on back: ${fullReload}`);
console.log(`Intro-dismissed class survives: ${stateSurvives}`);
console.log(`bfcache check:`, bfcacheWorked);

if (!fullReload && stateSurvives) {
  console.log('PASS: bfcache works without reload + state survives -> drop the pageshow listener');
  process.exit(0);
}
if (fullReload) {
  console.log('FAIL: full page reload on back navigation');
  process.exit(1);
}
console.log('FAIL: intro state did not survive bfcache');
process.exit(1);