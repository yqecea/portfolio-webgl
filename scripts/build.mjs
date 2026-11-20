import { cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const stage = await mkdtemp(join(root, '.dist-'));
const entries = [
  '404.html', 'index.html', 'pages', 'css', 'src',
  'favicon.svg', 'favicon-180.png', 'logo.svg', 'profile.jpg',
  'robots.txt', 'sitemap.xml', 'site.webmanifest',
  'assets/og-card.png', 'assets/work', 'assets/sound',
  'assets/sphere/matCap0.jpg', 'assets/sphere/slice.json',
];

try {
  for (const entry of entries) {
    await cp(join(root, entry), join(stage, entry), { recursive: true });
  }
  await rm(dist, { recursive: true, force: true });
  await rename(stage, dist);
  console.log('Built dist/ for Firebase Hosting');
} finally {
  await rm(stage, { recursive: true, force: true });
}
