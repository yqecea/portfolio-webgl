import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serve } from './serve.mjs';

const server = process.env.PORTFOLIO_BASE ? null : await serve();
const base = process.env.PORTFOLIO_BASE || server.url;
const output = process.env.PORTFOLIO_EVIDENCE || 'artifacts/browser';
await mkdir(output, { recursive: true });

let browser;
const report = { base, urls: [], accessibility: {}, scenarios: [], errors: [] };
const externalUrls = new Set();
const localUrls = new Set();
const pages = ['/', '/work', '/about', '/contact', '/cookie', '/pages/work.html',
  '/pages/about.html', '/pages/contact.html', '/pages/cookie.html'];
const violations = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  async function withPage(options, scenario) {
    const context = await browser.newContext(options);
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') report.errors.push(message.text());
      });
      await scenario(page, context);
    } finally {
      await context.close();
    }
  }

  const open = (page, path) => page.goto(base + path, { waitUntil: 'load', timeout: 16000 });
  const shot = (page, name) => page.screenshot({ path: join(output, name + '.png'), timeout: 8000 });
  const mobile = width => ({ ...devices['Pixel 7'], deviceScaleFactor: 1, viewport: { width, height: 800 } });
  const enter = page => page.getByRole('button', { name: /click anywhere.*to start/i });
  const openMenu = page => page.getByRole('button', { name: 'Open menu' });
  const ready = page => page.waitForFunction(() => {
    const fill = document.querySelector('.load .text-fill');
    return document.body.classList.contains('intro-load-active') && fill.style.width === '100%';
  });
  const noOverflow = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  async function collect(page, pathname) {
    const links = await page.locator('a[href],img[src],link[href],script[src],meta[property="og:image"]').evaluateAll(nodes =>
      nodes.filter(node => node.rel !== 'preconnect' && node.rel !== 'dns-prefetch')
        .map(node => node.href || node.src || node.content));
    for (const value of links) {
      const url = new URL(value, base + pathname);
      if (url.origin === base) {
        if (url.hash) {
          assert.equal(await page.locator('[id=' + JSON.stringify(url.hash.slice(1)) + ']').count(), 1, value);
        } else {
          localUrls.add(url.href);
        }
      } else if (url.protocol === 'https:') {
        externalUrls.add(url.href);
      }
    }
  }

  async function audit(page, label) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const findings = result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(node => node.target) }));
    report.accessibility[label] = findings;
    violations.push(...findings.map(finding => label + ' ' + finding.id));
  }

  await withPage({ viewport: { width: 1440, height: 900 } }, async page => {
    for (const path of pages) {
      const response = await open(page, path);
      assert.equal(response.status(), 200, path);
      assert.equal((await response.allHeaders())['x-content-type-options'], 'nosniff');
      assert.doesNotMatch((await response.allHeaders())['content-security-policy'], /unsafe-eval/);
      await collect(page, path);
      if (path !== '/' && !path.startsWith('/pages/')) await audit(page, path);
    }

    for (const url of localUrls) {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      assert.equal(response.ok, true, 'Broken local URL: ' + url);
    }
    // App paths which aren't HTML references.
    for (const path of ['/assets/og-card.png', '/assets/sphere/slice.json', '/assets/sound/mainSound.mp3',
      '/robots.txt', '/sitemap.xml', '/site.webmanifest', '/pages/credits.html', '/favicon.ico']) {
      assert.equal((await fetch(base + path, { method: 'HEAD' })).ok, true, path);
    }
    for (const path of ['/missing-portfolio-audit-path', '/AGENTS.md', '/tests/bfcache.mjs']) {
      assert.equal((await fetch(base + path, { method: 'HEAD' })).status, 404, path);
    }

    const entryRequests = [];
    page.on('request', request => entryRequests.push(new URL(request.url()).pathname));
    await open(page, '/');
    await ready(page);
    assert.equal(entryRequests.some(path => /three\.js$|mainSound\.mp3$/.test(path)), false);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Skip to content');
    await page.keyboard.press('Tab');
    assert.equal(await enter(page).evaluate(el => el === document.activeElement), true);
    await shot(page, 'after-desktop-home');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.body.classList.contains('intro-revealing'));
    assert.equal(await page.getByRole('link', { name: 'Start explore' }).evaluate(el => el === document.activeElement), true);
    await page.waitForSelector('.webglholder:not(.webgl-fallback) canvas', { state: 'visible' });
    await page.waitForFunction(() => window.soundReactor?.isPlaying());
    await shot(page, 'after-desktop-hero');
    await audit(page, 'home');

    await open(page, '/work');
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 1400);
    await page.waitForFunction(() => document.querySelector('.p-grid').getBoundingClientRect().left < -500);
    await page.locator('.p-col').last().focus();
    await page.waitForFunction(() => document.querySelector('.p-col:last-child').getBoundingClientRect().right <= innerWidth + 2);
    await open(page, '/work');
    await page.waitForFunction(() => [...document.querySelectorAll('.p-col:nth-of-type(-n+3) img')]
      .every(img => img.complete && img.naturalWidth > 0));
    await shot(page, 'after-desktop-work');
    report.scenarios.push('desktop keyboard intro, deferred audio and WebGL, wheel and card focus, aliases, headers, resources and 404');
  });

  for (const width of [360, 430, 1024]) {
    await withPage(mobile(width), async (page, context) => {
      await open(page, '/work');
      await noOverflow(page);
      assert.equal(await page.locator('.p-col').count(), 10);
      assert.equal(await page.locator('.native-horizontal-scroll').count(), 0);
      if (width === 360) await shot(page, 'after-mobile-work');
      const client = await context.newCDPSession(page);
      const x = Math.floor(width / 2);
      const touch = (type, y) => client.send('Input.dispatchTouchEvent', {
        type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
      await touch('touchStart', 650);
      for (const y of [600, 550, 490, 430, 360, 290]) await touch('touchMove', y);
      await touch('touchEnd');
      await page.waitForFunction(() => scrollY > 100);
      await open(page, '/work');
      await openMenu(page).tap();
      await page.waitForFunction(() => document.querySelector('.trigger.burgerclickablein').getAttribute('aria-expanded') === 'true');
      await page.getByRole('link', { name: 'about', exact: true }).tap();
      await page.waitForURL('**/pages/about.html');
      await noOverflow(page);
      report.scenarios.push(`${width}px real Chrome touch swipe and Work → About menu link`);
      if (width !== 360) return;

      await open(page, '/');
      await ready(page);
      await openMenu(page).tap();
      await page.getByRole('link', { name: 'about', exact: true }).waitFor();
      assert.equal(await page.locator('.trigger.burgerclickablein').getAttribute('aria-expanded'), 'true');
      report.scenarios.push('mobile menu opener works directly from the full-screen intro');

      await open(page, '/');
      await ready(page);
      await shot(page, 'after-mobile-home');
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await enter(page).tap();
      const holder = page.locator('.webglholder');
      await page.waitForSelector('.webglholder:not(.webgl-fallback) canvas', { state: 'visible' });
      const canvas = holder.locator('canvas');
      assert.equal(await canvas.evaluate(el => el.width), 360);
      await shot(page, 'after-mobile-hero');

      const lost = await canvas.evaluate(el => {
        const context = el.getContext('webgl2') || el.getContext('webgl');
        window.auditWebglContext = context.getExtension('WEBGL_lose_context');
        window.auditWebglContext?.loseContext();
        return Boolean(window.auditWebglContext);
      });
      if (lost) {
        await page.waitForFunction(() => document.querySelector('.webglholder').dataset.fallbackReason === 'context-loss');
        await page.evaluate(() => window.auditWebglContext.restoreContext());
        await page.waitForSelector('.webglholder:not(.webgl-fallback) canvas', { state: 'visible' });
        assert.equal(await canvas.count(), 1);
      }
      report.scenarios.push(lost ? 'mobile software WebGL: context lost, poster shown, context restored' : 'software WebGL rendered, context loss extension unavailable');

      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.setViewportSize({ width: 800, height: 360 });
      await open(page, '/');
      await enter(page).tap();
      await page.getByRole('link', { name: 'See all 10 projects' }).tap();
      await page.waitForURL('**/pages/work.html');
      await noOverflow(page);
      await shot(page, 'after-landscape-work');
      report.scenarios.push('landscape entry and link');
    });
  }

  await withPage({ ...mobile(390), reducedMotion: 'reduce' }, async page => {
    await open(page, '/');
    await enter(page).tap();
    assert.equal(await page.locator('.webglholder canvas').count(), 0);
    await shot(page, 'after-reduced-motion');
    await audit(page, 'home/reduced-motion');
    await openMenu(page).tap();
    assert.equal(await page.getByRole('button', { name: 'Close menu' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('link', { name: 'intro', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await openMenu(page).evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('button', { name: 'Close menu' }).count(), 0);
    report.scenarios.push('reduced motion: no WebGL, menu focus trap, Escape and focus restoration');
  });
  assert.deepEqual(report.errors, []);
  assert.deepEqual(violations, [], 'WCAG A/AA violations');

  await withPage(mobile(390), async (page, context) => {
    await context.route('**/src/webgl/vendor/three.js', route => route.abort());
    await open(page, '/');
    await enter(page).tap();
    await page.waitForFunction(() => document.querySelector('.webglholder').dataset.fallbackReason === 'dependency');
    await page.getByRole('link', { name: 'See all 10 projects' }).tap();
    await page.waitForURL('**/pages/work.html');
    report.scenarios.push('blocked WebGL dependency: static sphere and project link still work');
    report.expectedFaultConsole = report.errors.splice(0);
  });
} finally {
  report.urls = { local: [...localUrls].sort(), external: [...externalUrls].sort() };
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server?.close();
}
console.log('Browser checks passed: ' + report.scenarios.join('; '));
