// scripts/smoke-lenis-sri.mjs
// Browser smoke test: load each page, capture console errors + network failures.
// Specifically flag any SRI integrity mismatches for jsdelivr CDN tags.

import { chromium } from '/home/yqecea/.nvm/versions/node/v24.12.0/lib/node_modules/playwright/index.mjs';

const pages = [
  { name: 'home', url: 'http://127.0.0.1:5555/' },
  { name: 'about', url: 'http://127.0.0.1:5555/pages/about.html' },
  { name: 'contact', url: 'http://127.0.0.1:5555/pages/contact.html' },
  { name: 'work', url: 'http://127.0.0.1:5555/pages/work.html' },
  { name: 'cookie', url: 'http://127.0.0.1:5555/pages/cookie.html' },
];

const browser = await chromium.launch();
const context = await browser.newContext();
const failures = [];

for (const p of pages) {
  const page = await context.newPage();
  const consoleErrors = [];
  const sriErrors = [];
  const networkFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      if (/integrity|sha384|sha512/i.test(msg.text())) {
        sriErrors.push(msg.text());
      }
    }
  });
  page.on('requestfailed', (req) => {
    networkFailures.push(`${req.url()} — ${req.failure()?.errorText || 'unknown'}`);
  });

  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
  } catch (e) {
    failures.push(`${p.name}: navigation failed: ${e.message}`);
  }

  // Check for SRI-related errors specifically
  if (sriErrors.length > 0) {
    failures.push(`${p.name}: SRI errors: ${sriErrors.join('; ')}`);
  }
  if (networkFailures.some((f) => /jsdelivr|lenis/i.test(f))) {
    failures.push(`${p.name}: jsdelivr/lenis network failure: ${networkFailures.filter(f => /jsdelivr|lenis/i.test(f)).join('; ')}`);
  }

  console.log(`[${p.name}] console errors: ${consoleErrors.length}, SRI errors: ${sriErrors.length}, network failures: ${networkFailures.length}`);
  if (consoleErrors.length > 0) {
    console.log(`  console: ${consoleErrors.slice(0, 3).join(' | ')}`);
  }

  await page.close();
}

await browser.close();

if (failures.length > 0) {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log(`PASS: All ${pages.length} pages loaded without SRI errors or jsdelivr network failures`);