// tests/webgl-context-loss.mjs
// Spike: does WebGL context loss/restore leak memory in WebGLApp.js?
// Per plan 011 P1.2: if leak confirmed, open follow-up fix slice;
// otherwise close as not-reproducible.

import { chromium } from '/home/yqecea/.nvm/versions/node/v24.12.0/lib/node_modules/playwright/index.mjs';

const CYCLES = 10;
const LEAK_RATIO_THRESHOLD = 1.5; // 50% growth = flag

const browser = await chromium.launch({
  args: ['--enable-unsafe-extensions', '--js-flags=--expose-gc'],
});
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('http://127.0.0.1:5555/index.html', { waitUntil: 'networkidle' });
// Wait for WebGL to mount
await page.waitForSelector('.webglholder canvas', { timeout: 10000 });
await page.waitForTimeout(2000);

const samples = [];
for (let i = 0; i < CYCLES; i++) {
  await page.evaluate(() => {
    const canvas = document.querySelector('.webglholder canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    ext.restoreContext();
  });
  await page.waitForTimeout(500);
  const heap = await page.evaluate(() => performance.memory.usedJSHeapSize);
  samples.push(heap);
}

await browser.close();

const first = samples[0];
const last = samples[samples.length - 1];
const ratio = last / first;
const leak = ratio > LEAK_RATIO_THRESHOLD;

console.log(`Heap samples (bytes): ${samples.join(', ')}`);
console.log(`Ratio last/first: ${ratio.toFixed(2)}x (threshold: ${LEAK_RATIO_THRESHOLD}x)`);
console.log(`Cycles: ${CYCLES}`);
console.log(leak ? 'FAIL: memory leak suspected' : 'PASS: heap stable across context-loss cycles');

process.exit(leak ? 1 : 0);