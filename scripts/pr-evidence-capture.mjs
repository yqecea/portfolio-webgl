#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const TOTAL_BUDGET_MS = 240_000;
const NAV_TIMEOUT_MS = 45_000;
const SETTLE_MS = 1_500;
const MIN_MEM_AVAILABLE_MB = 3 * 1024;
const CHROME_CANDIDATES = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

const VIEWPORTS = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
};

function usage(code) {
  console.error('usage: node scripts/pr-evidence-capture.mjs <before-url> <after-url> <screen-slug> [output-dir]');
  process.exit(code);
}

function deadlineGuard(deadline) {
  const left = deadline - Date.now();
  if (left <= 0) {
    throw new Error('time budget exhausted');
  }
  return left;
}

async function memAvailableMb() {
  const text = await readFile('/proc/meminfo', 'utf8');
  const match = text.match(/^MemAvailable:\s+(\d+)\s+kB/m);
  return match ? Number(match[1]) / 1024 : Infinity;
}

async function loadPlaywright() {
  // Resolve from the caller's repo (cwd) first, then relative to this script,
  // so the script is vendorable without declaring playwright here.
  const requireFromCwd = createRequire(path.join(process.cwd(), 'noop.js'));
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return requireFromCwd(name);
    } catch {
      try {
        return await import(name);
      } catch {
        // try next
      }
    }
  }
  console.error('playwright (or playwright-core) is not installed; run it where it is a dependency');
  process.exit(3);
}

async function launchChromium(playwright, deadline) {
  const options = () => ({ headless: true, timeout: Math.min(20_000, deadlineGuard(deadline)) });
  try {
    return await playwright.chromium.launch(options());
  } catch (err) {
    for (const executablePath of CHROME_CANDIDATES) {
      try {
        return await playwright.chromium.launch({ ...options(), executablePath });
      } catch {
        // try next binary
      }
    }
    try {
      return await playwright.chromium.launch({ ...options(), channel: 'chrome' });
    } catch {
      throw err;
    }
  }
}

async function capture(browser, url, viewport, outFile, deadline) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: Math.min(NAV_TIMEOUT_MS, deadlineGuard(deadline)),
    });
    if (!response) {
      throw new Error(`no response navigating ${url}`);
    }
    if (!response.ok()) {
      throw new Error(`navigation ${url} returned HTTP ${response.status()}`);
    }
    await page.waitForTimeout(SETTLE_MS);
    deadlineGuard(deadline);
    await page.screenshot({
      path: outFile,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      timeout: deadlineGuard(deadline),
    });
  } finally {
    await context.close();
  }
}

async function main() {
  const [beforeUrl, afterUrl, slug, outDirArg] = process.argv.slice(2);
  if (!beforeUrl || !afterUrl || !slug || process.argv.length > 6) usage(64);
  for (const [label, url] of [['before', beforeUrl], ['after', afterUrl]]) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || !['127.0.0.1', '[::1]', 'localhost'].includes(parsed.hostname) || parsed.username || parsed.password) {
        throw new Error('expected a local preview URL');
      }
    } catch {
      console.error(`${label}-url must be an HTTP or HTTPS loopback preview`);
      process.exit(64);
    }
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error(`screen slug must be a safe path segment: ${slug}`);
    process.exit(64);
  }

  const mem = await memAvailableMb();
  if (mem < MIN_MEM_AVAILABLE_MB) {
    console.error(`MemAvailable ${Math.round(mem)} MB < ${MIN_MEM_AVAILABLE_MB} MB; not running a browser now`);
    process.exit(75);
  }

  const outDir = path.resolve(outDirArg ?? path.join('docs', 'pr-evidence', slug));
  await mkdir(outDir, { recursive: true });

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const playwright = await loadPlaywright();
  const browser = await launchChromium(playwright, deadline);
  let staged;
  try {
    staged = await mkdtemp(path.join(outDir, '.capture-'));
    const names = [];
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      for (const [label, url] of [['before', beforeUrl], ['after', afterUrl]]) {
        const filename = `${label}-${name}.png`;
        await capture(browser, url, viewport, path.join(staged, filename), deadline);
        names.push(filename);
      }
    }
    for (const filename of names) {
      await rename(path.join(staged, filename), path.join(outDir, filename));
      console.log(`wrote ${path.join(outDir, filename)}`);
    }
  } finally {
    if (staged) await rm(staged, { recursive: true, force: true });
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
