import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { once } from 'node:events';

// Browser smoke for the actual Next static export. Never use production URLs.
const root = resolve(process.cwd(), 'out');
assert.ok(existsSync(join(root, 'index.html')), 'BUILD_OUTPUT_MISSING: generate the Next static export before browser QA');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const extensionOf = (p) => p.match(/\.[A-Za-z0-9]+$/)?.[0] || '.html';
const serveFile = (req, res) => {
  let url;
  try { url = new URL(req.url || '/', 'http://127.0.0.1'); }
  catch { res.writeHead(400).end(); return; }
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
  if (path.includes('\0') || path.includes('\\')) { res.writeHead(400).end(); return; }
  const filename = resolve(root, '.' + path, path.endsWith('/') ? 'index.html' : '');
  if (!(filename === root || filename.startsWith(root + sep))) { res.writeHead(403).end(); return; }
  let requested = filename;
  if (!existsSync(requested) || !statSync(requested).isFile()) {
    requested = resolve(root, '.' + path, 'index.html');
  }
  const found = existsSync(requested) && statSync(requested).isFile() && requested.startsWith(root + sep);
  const actual = found ? requested : join(root, '404.html');
  const status = found ? 200 : 404;
  const bytes = existsSync(actual) ? readFileSync(actual) : Buffer.from('Not found');
  res.writeHead(status, { 'Content-Type': mime[extensionOf(actual)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(bytes);
};
const server = createServer(serveFile);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const observations = [];
try {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('PLAYWRIGHT_MODULE_MISSING: run npm ci with the pinned lockfile before this QA'); }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // No external calls are permitted, including live Supabase, analytics or fonts.
  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.origin === base) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const valid = ['/', '/contact/', '/custom-order/', '/bulk-order/', '/account/', '/services/', '/about/', '/faq/', '/materials/', '/our-work/', '/how-it-works/', '/policies/', '/custom-order/success/', '/bulk-order/success/'];
  for (const path of valid) {
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    observations.push({ path, status: response.status(), scope: 'localhost static export' });
    assert.equal(response.status(), 200, `Customer page not 200: ${path}`);
    assert.ok((await page.title()).length > 0, `Missing page title: ${path}`);
    const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(e => e.getAttribute('href') || ''));
    assert.ok(!hrefs.some(h => /\/(?:candidate|careers|verify-interview|admin\/recruitment|recruitment-privacy|recruitment-terms)(?:\/|$|[?#])/.test(h)), `Candidate click link: ${path}`);
    assert.ok(!hrefs.some(h => /\/(?:shop|cart|checkout)(?:\/|$|[?#])/.test(h)), `Hidden retail click link: ${path}`);
  }
  for (const path of ['/candidate/', '/candidate/activate/', '/careers/', '/careers/training/', '/verify-interview/', '/admin/recruitment/', '/admin/recruitment/legacy/', '/admin/recruitment/extended/', '/recruitment-privacy/', '/recruitment-terms/', '/shop/sample-desk-nameplate/']) {
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    observations.push({ path, status: response.status(), scope: 'localhost static export' });
    assert.equal(response.status(), 404, `Discontinued deep link must be 404: ${path}`);
  }
  for (const path of ['/shop/', '/cart/', '/checkout/']) {
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    observations.push({ path, status: response.status(), scope: 'localhost static export' });
    assert.equal(response.status(), 200, `Existing hidden-retail placeholder missing: ${path}`);
    assert.match(await page.locator('body').innerText(), /not publicly available/i, `Retail must stay unavailable: ${path}`);
  }
  assert.deepEqual(pageErrors, [], `Browser exceptions: ${pageErrors.join(' | ')}`);
  if (existsSync('execution-evidence/V7_30OCT2026_CODEX_PHASE1')) writeFileSync('execution-evidence/V7_30OCT2026_CODEX_PHASE1/browser-results.json', JSON.stringify({ observations, pageErrors }, null, 2));
  await ctx.close();
  console.log(`CUSTOMER_ONLY_BROWSER_PASS: ${valid.length} customer routes, 11 denied deep links, 3 retail placeholders, 0 page errors; localhost only`);
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
