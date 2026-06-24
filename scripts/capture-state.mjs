// scripts/capture-state.mjs - Real-device state capture for all reported issues
import { chromium, devices } from '/home/yqecea/.nvm/versions/node/v24.12.0/lib/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:5555';
const OUT = resolve('evidence/state');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const findings = {};

// ============ Issue 1: Mobile second intro ============
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { findings.mobile_intro_errors = findings.mobile_intro_errors || []; findings.mobile_intro_errors.push(e.message); });
  await page.goto(`${BASE}/index.html?cb=${Date.now()}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/01-mobile-intro-first.png` });
  // The intro overlay is full-viewport. Use evaluate to dispatch a click
  // event since the element is intercepted by other layers in iPhone 13
  // emulation. The stripper + HomeIntroMotion should still receive it.
  await page.evaluate(() => {
    const intro = document.querySelector('.load.hometoggler');
    if (intro) intro.click();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/02-mobile-intro-second.png` });
  // After my single-tap fix, the first click should already show the
  // post-intro state. Capture it.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/03-mobile-post-intro.png` });
  findings.mobile_intro = await page.evaluate(() => {
    const heroRows = Array.from(document.querySelectorAll('.hero .h-row'));
    const hHeads = Array.from(document.querySelectorAll('.h-head')).map(el => ({
      text: el.textContent.trim(),
      transform: window.getComputedStyle(el).transform,
      rect: el.getBoundingClientRect()
    }));
    const webglholder = document.querySelector('.webglholder');
    return {
      bodyClass: document.body.className,
      heroRowCount: heroRows.length,
      heroRowDisplay: heroRows.map(r => window.getComputedStyle(r).display),
      hHeads,
      webglholderRect: webglholder?.getBoundingClientRect(),
      webglholderOpacity: webglholder ? window.getComputedStyle(webglholder).opacity : null
    };
  });
  await ctx.close();
}

// ============ Issue 2: Work page narrow screens ============
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pages/work.html?cb=${Date.now()}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/04-mobile-work-top.png` });
  const scrollResult = await page.evaluate(async () => {
    const before = window.scrollY;
    window.scrollTo(0, 500);
    await new Promise(r => setTimeout(r, 500));
    const after = window.scrollY;
    return { before, after, html_overflowX: document.documentElement.overflowX, body_overflowX: document.body.overflowX };
  });
  findings.work_scroll = scrollResult;
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05-mobile-work-scrolled.png` });
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-mobile-work-mid.png` });
  await ctx.close();
}

// ============ Issue 3: Contact page email/newsletter ============
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pages/contact.html?cb=${Date.now()}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/07-mobile-contact-newsletter.png` });
  findings.contact_newsletter = await page.evaluate(() => {
    const wFormDone = document.querySelector('.w-form-done');
    const wFormFail = document.querySelector('.w-form-fail');
    const contactBtn = document.querySelector('.contact-button');
    const email = document.querySelector('.c-email-w');
    return {
      wFormDone_display: wFormDone ? window.getComputedStyle(wFormDone).display : 'missing',
      wFormDone_visible: wFormDone?.getBoundingClientRect(),
      wFormDone_text: wFormDone?.textContent?.trim().slice(0, 80),
      wFormFail_display: wFormFail ? window.getComputedStyle(wFormFail).display : 'missing',
      wFormFail_visible: wFormFail?.getBoundingClientRect(),
      contactBtn_rect: contactBtn?.getBoundingClientRect(),
      email_rect: email?.getBoundingClientRect()
    };
  });
  await ctx.close();
}

// ============ Issue 4: Desktop work + menu close button ============
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html?cb=${Date.now()}`);
  await page.waitForLoadState('domcontentloaded');
  // Single-tap workflow: first click dismisses intro and reveals the
  // post-intro state with the "Start Explore" CTA.
  await page.evaluate(() => document.querySelector('.load.hometoggler')?.click());
  await page.waitForTimeout(1500);
  await page.click('.trigger.burgerclickablein');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/08-desktop-menu-open.png` });
  findings.menu_close = await page.evaluate(() => {
    const closeEls = Array.from(document.querySelectorAll('[class*="close" i], [class*="burgerclickableout" i], [aria-label*="close" i], [aria-label*="menu" i]'));
    return {
      closeElements: closeEls.map(el => ({
        tag: el.tagName,
        class: el.className.toString().slice(0, 60),
        ariaLabel: el.getAttribute('aria-label'),
        visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
      })),
    };
  });
  await ctx.close();
}

await browser.close();
await writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
