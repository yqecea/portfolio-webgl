// scripts/verify-baseline.mjs
// Captures S1-S5 baseline evidence from http://127.0.0.1:5555
import { chromium } from '/home/yqecea/.nvm/versions/node/v24.12.0/lib/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'evidence/baseline');
const BASE = 'http://127.0.0.1:5555';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const report = {};

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, type: 'png' });
  return path;
}

// === MOBILE 375x812 ===
const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const mPage = await mobileCtx.newPage();

// S1: mobile home intro + post-intro
await mPage.goto(`${BASE}/index.html`);
await mPage.waitForLoadState('networkidle');
await shot(mPage, '01-mobile-home-intro-first-375x812.png');
await mPage.click('.load.hometoggler');
await mPage.waitForTimeout(600);
await shot(mPage, '02-mobile-home-intro-second-375x812.png');
await mPage.click('.load.hometoggler');
await mPage.waitForTimeout(800);

report.s1_mobile_hero_h_blocks = await mPage.$$eval('.h-block', (els) =>
  els.map((el) => {
    const cs = window.getComputedStyle(el);
    return {
      class: el.className,
      display: cs.display,
      rect: el.getBoundingClientRect(),
      head: el.querySelector('.h-head, .h-slant')?.textContent?.trim().slice(0, 20) || null,
      headTransform: el.querySelector('.h-head') ? window.getComputedStyle(el.querySelector('.h-head')).transform : null,
    };
  })
);
await shot(mPage, '03-mobile-home-post-intro-375x812.png');

// S3: work page scroll
await mPage.goto(`${BASE}/pages/work.html`);
await mPage.waitForLoadState('networkidle');
await shot(mPage, '04-mobile-work-375x812.png');
report.s3_work_overflow = await mPage.evaluate(() => {
  const body = window.getComputedStyle(document.body);
  const html = window.getComputedStyle(document.documentElement);
  const ss = document.querySelector('.sidescrollbox');
  const ssCs = ss ? window.getComputedStyle(ss) : null;
  const navTrigger = document.querySelector('.nav-trigger');
  const navCs = navTrigger ? window.getComputedStyle(navTrigger) : null;
  return {
    body_overflow: body.overflow,
    body_overflow_x: body.overflowX,
    body_overflow_y: body.overflowY,
    html_overflow: html.overflow,
    html_overflow_x: html.overflowX,
    sidescrollbox_overflow: ssCs?.overflow,
    sidescrollbox_height: ssCs?.height,
    sidescrollbox_touch_action: ssCs?.touchAction,
    nav_trigger_pointer_events: navCs?.pointerEvents,
    nav_trigger_rect: navTrigger?.getBoundingClientRect(),
    page_height: document.documentElement.scrollHeight,
    viewport_height: window.innerHeight,
  };
});

// S5: contact page email
await mPage.goto(`${BASE}/pages/contact.html`);
await mPage.waitForLoadState('networkidle');
await shot(mPage, '05-mobile-contact-375x812.png');
report.s5_email = await mPage.evaluate(() => {
  const email = document.querySelector('.c-email-w');
  const cta = document.querySelector('.contact-button');
  return {
    c_email_w: email
      ? { href: email.getAttribute('href'), rect: email.getBoundingClientRect(), pointerEvents: window.getComputedStyle(email).pointerEvents }
      : null,
    contact_button: cta
      ? { href: cta.getAttribute('href'), rect: cta.getBoundingClientRect(), pointerEvents: window.getComputedStyle(cta).pointerEvents }
      : null,
  };
});

await mobileCtx.close();

// === DESKTOP 1440x900 ===
const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dPage = await dCtx.newPage();

await dPage.goto(`${BASE}/index.html`);
await dPage.waitForLoadState('networkidle');
await shot(dPage, '06-desktop-home-intro-first-1440x900.png');
await dPage.click('.load.hometoggler');
await dPage.waitForTimeout(400);
await dPage.click('.load.hometoggler');
await dPage.waitForTimeout(800);
report.s2_desktop_hero_h_heads = await dPage.$$eval('.h-head', (els) =>
  els.map((el) => ({
    text: el.textContent.trim(),
    transform: window.getComputedStyle(el).transform,
    opacity: window.getComputedStyle(el).opacity,
    rect: el.getBoundingClientRect(),
  }))
);
await shot(dPage, '07-desktop-home-post-intro-1440x900.png');

// S4: menu open
await dPage.click('.trigger.burgerclickablein');
await dPage.waitForTimeout(1200);
report.s4_menu_items = await dPage.$$eval('.menu-item, .menu-as', (els) =>
  els.map((el) => ({
    class: el.className,
    opacity: window.getComputedStyle(el).opacity,
    transform: window.getComputedStyle(el).transform,
  }))
);
await shot(dPage, '08-desktop-menu-open-1440x900.png');

// S6: perf
const perf = await dPage.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  return {
    dom_content_loaded_ms: Math.round(n.domContentLoadedEventEnd - n.fetchStart),
    load_complete_ms: Math.round(n.loadEventEnd - n.fetchStart),
    dom_interactive_ms: Math.round(n.domInteractive - n.fetchStart),
  };
});
report.s6_perf = perf;

await dCtx.close();
await browser.close();

await writeFile(resolve(OUT, 'baseline-metrics.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
