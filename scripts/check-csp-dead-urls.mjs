#!/usr/bin/env node
// scripts/check-csp-dead-urls.mjs
// Asserts every URL in CSP source lists (script-src, style-src, connect-src, etc.)
// is referenced somewhere in the codebase. Reports dead URLs as failures.

import { readFileSync, existsSync } from 'node:fs';

const firebase = JSON.parse(readFileSync('firebase.json', 'utf8'));
const cspHeader = firebase.hosting.headers[0].headers.find(
  (h) => h.key === 'Content-Security-Policy'
);
if (!cspHeader) {
  console.error('FAIL: No Content-Security-Policy header found in firebase.json');
  process.exit(1);
}

const directives = cspHeader.value.split(';').map((s) => s.trim());
const sourceUrls = new Set();
for (const d of directives) {
  for (const token of d.split(/\s+/)) {
    if (token.startsWith('https://')) sourceUrls.add(token);
  }
}

const filesToScan = [
  'index.html',
  'pages/about.html',
  'pages/contact.html',
  'pages/work.html',
  'pages/cookie.html',
  'css/style.css',
  'src/main.js',
  'src/scroll/LenisSmoothScroll.js',
];
let allContent = '';
for (const f of filesToScan) {
  if (!existsSync(f)) continue;
  allContent += readFileSync(f, 'utf8') + '\n';
}

const dead = [];
for (const url of sourceUrls) {
  if (!allContent.includes(url)) {
    dead.push(url);
  }
}

if (dead.length > 0) {
  console.error('FAIL: Dead CSP source URLs (no codebase references):');
  for (const u of dead) console.error('  -', u);
  process.exit(1);
}
console.log(`PASS: All ${sourceUrls.size} CSP source URLs are referenced in the codebase`);