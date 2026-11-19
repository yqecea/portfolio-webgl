import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { matchesGlob, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const { hosting } = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url)));
const root = resolve(project, hosting.public);
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg',
};

export async function serve(port = 0) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      for (const { source, headers } of hosting.headers) {
        if (matchesGlob(pathname.slice(1), source) || source === '**') {
          for (const { key, value } of headers) response.setHeader(key, value);
        }
      }
      const redirect = hosting.redirects.find(({ source }) => source === pathname);
      if (redirect) {
        response.writeHead(redirect.type, { Location: redirect.destination }).end();
        return;
      }

      const destination = hosting.rewrites.find(({ source }) => source === pathname)?.destination ?? pathname;
      const relative = destination.replace(/^\/+/, '') || 'index.html';
      const candidate = resolve(root, relative);
      const allowed = candidate.startsWith(root.endsWith(sep) ? root : root + sep)
        && !relative.split('/').some(part => part.startsWith('.'))
        && !hosting.ignore.some(pattern => matchesGlob(relative, pattern));
      const file = allowed && await stat(candidate).catch(() => null);
      const found = Boolean(file && file.isFile());
      const path = found ? candidate : resolve(root, '404.html');
      response.writeHead(found ? 200 : 404, {
        'Content-Type': mime[extname(path)] || 'application/octet-stream',
      });
      if (request.method === 'HEAD') response.end();
      else createReadStream(path).pipe(response);
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise((fulfill, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', fulfill);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((fulfill, reject) => server.close(error => error ? reject(error) : fulfill())),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.env.PORT || 4173));
  console.log(server.url);
}
