#!/usr/bin/env node
// scripts/check-cdn-sri.mjs
// Asserts every <script src="HTTPS CDN"> and
// <link rel="stylesheet" href="HTTPS CDN"> has integrity + crossorigin.

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
  const content = readFileSync(page, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

  // <script src="HTTPS CDN">
  const scriptRe = /<script[^>]*\bsrc=["']https:\/\/[^"']*["'][^>]*>/g;
  const scripts = content.match(scriptRe) || [];
  for (const tag of scripts) {
    if (!tag.includes('integrity=')) {
      failures.push(`${page}: <script> from a CDN missing integrity attribute`);
    }
    if (!tag.includes('crossorigin=')) {
      failures.push(`${page}: <script> from a CDN missing crossorigin attribute`);
    }
  }

  // <link rel="stylesheet" href="HTTPS CDN">
  const linkRe = /<link[^>]*\bhref=["']https:\/\/[^"']*["'][^>]*>/g;
  const links = content.match(linkRe) || [];
  for (const tag of links) {
    if (!/\brel=["']stylesheet["']/.test(tag)) continue;
    if (!tag.includes('integrity=')) {
      failures.push(`${page}: <link> from a CDN missing integrity attribute`);
    }
    if (!tag.includes('crossorigin=')) {
      failures.push(`${page}: <link> from a CDN missing crossorigin attribute`);
    }
  }
}

if (failures.length > 0) {
  console.error('FAIL: CDN SRI check failed:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log(`PASS: All CDN scripts and stylesheets have integrity + crossorigin (${pages.length} pages scanned)`);