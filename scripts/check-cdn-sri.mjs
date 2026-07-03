#!/usr/bin/env node
// scripts/check-cdn-sri.mjs
// Asserts every <script src="https://cdn.jsdelivr.net..."> and
// <link rel="stylesheet" href="https://cdn.jsdelivr.net..."> has integrity + crossorigin.

import { readFileSync, existsSync } from 'node:fs';

const pages = [
  'index.html',
  'pages/about.html',
  'pages/contact.html',
  'pages/work.html',
  'pages/cookie.html',
];
const failures = [];

for (const page of pages) {
  if (!existsSync(page)) continue;
  const content = readFileSync(page, 'utf8');

  // <script src="https://cdn.jsdelivr.net...">
  const scriptRe = /<script[^>]*\bsrc=["']https:\/\/cdn\.jsdelivr\.net[^"']*["'][^>]*>/g;
  const scripts = content.match(scriptRe) || [];
  for (const tag of scripts) {
    if (!tag.includes('integrity=')) {
      failures.push(`${page}: <script> from jsdelivr missing integrity attribute`);
    }
    if (!tag.includes('crossorigin=')) {
      failures.push(`${page}: <script> from jsdelivr missing crossorigin attribute`);
    }
  }

  // <link rel="stylesheet" href="https://cdn.jsdelivr.net...">
  // Skip preconnect/preload/prefetch hints (no content to integrity-check)
  const linkRe = /<link[^>]*\bhref=["']https:\/\/cdn\.jsdelivr\.net[^"']*["'][^>]*>/g;
  const links = content.match(linkRe) || [];
  for (const tag of links) {
    if (/\brel=["'](?:preconnect|preload|prefetch)["']/.test(tag)) continue;
    if (!tag.includes('integrity=')) {
      failures.push(`${page}: <link> from jsdelivr missing integrity attribute`);
    }
    if (!tag.includes('crossorigin=')) {
      failures.push(`${page}: <link> from jsdelivr missing crossorigin attribute`);
    }
  }
}

if (failures.length > 0) {
  console.error('FAIL: CDN SRI check failed:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log(`PASS: All jsdelivr CDN tags (excluding preconnect/preload/prefetch hints) have integrity + crossorigin (${pages.length} pages scanned)`);