import { readFile } from 'node:fs/promises';

const pages = ['index.html', 'pages/work.html', 'pages/about.html', 'pages/contact.html', 'pages/cookie.html'];
const html = await Promise.all(pages.map(file => readFile(new URL('../' + file, import.meta.url), 'utf8')));
const urls = new Set(html.flatMap(document =>
  [...document.matchAll(/<a\b[^>]*\bhref="(https:\/\/[^"]+)"/g)].map(match => match[1])));
let failed = false;
for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    await response.body?.cancel();
    if (!response.ok) failed = true;
    console.log(response.status, url, response.redirected ? '→ ' + response.url : '');
  } catch (error) {
    failed = true;
    console.error(url, error.cause?.code || error.message);
  }
}
if (failed) process.exitCode = 1;
