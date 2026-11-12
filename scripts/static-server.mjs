import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'out');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

async function fileFor(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
  let candidate = join(root, safe);
  try {
    if ((await stat(candidate)).isDirectory()) candidate = join(candidate, 'index.html');
    await stat(candidate);
    return candidate;
  } catch {
    const html = `${candidate}.html`;
    try { await stat(html); return html; } catch { return join(root, '404.html'); }
  }
}

const host = process.env.HOST || '0.0.0.0';

createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  const file = await fileFor(pathname);
  try {
    const body = await readFile(file);
    response.writeHead(file.endsWith('404.html') ? 404 : 200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(500).end('Static server error');
  }
}).listen(port, host, () => console.log(`Static QA server: http://${host}:${port}`));
