import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { once } from 'node:events';

// A loopback acceptance adapter, never a deployment configuration.
const contract = JSON.parse(readFileSync('hosting/host-neutral-contract.json', 'utf8'));
const root = resolve('out');
assert.ok(existsSync(resolve(root, 'index.html')), 'Build the static export first');
assert.equal(contract.status, 'PENDING_FOUNDER_HOST_SELECTION');
const server = createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (path.includes('\\') || path.includes('\0')) { res.writeHead(400).end(); return; }
  for (const route of contract.deepLinks) {
    if (new RegExp('^' + route.source.replace(':reference', '[A-Za-z0-9-]+') + '/?$').test(path)) { path = route.destination; break; }
  }
  let file = resolve(root, '.' + path);
  if (!(file === root || file.startsWith(root + sep))) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  const found = existsSync(file) && statSync(file).isFile();
  if (!found) file = resolve(root, '404.html');
  res.writeHead(found ? 200 : 404, { ...contract.headers, 'Content-Type': extname(file) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  res.end(readFileSync(file));
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
let checks = 0;
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of contract.deepLinks) for (const suffix of ['', '/']) {
    const response = await fetch(base + route.source.replace(':reference', 'ESHA-2026-ABC12345') + suffix);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), readFileSync(resolve(root, '.' + route.destination, 'index.html'), 'utf8'));
    for (const [name, value] of Object.entries(contract.headers)) assert.equal(response.headers.get(name), value);
    checks++;
  }
  for (const path of ['/careers/', '/candidate/', '/admin/recruitment/', '/shop/sample-desk-nameplate/', '/unknown-route/']) {
    const response = await fetch(base + path); assert.equal(response.status, 404); checks++;
  }
  const response = await fetch(base + '/%5coutside'); assert.equal(response.status, 400); checks++;
  console.log(`HOST_NEUTRAL_HTTP_TESTS_PASS=${checks}; loopback adapter only; production PENDING_FOUNDER_HOST_SELECTION`);
} finally { await new Promise(resolve => server.close(resolve)); }
