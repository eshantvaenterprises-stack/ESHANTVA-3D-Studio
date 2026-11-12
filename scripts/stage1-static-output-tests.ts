import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const out = join(process.cwd(), 'out');
const internal = process.env.NEXT_PUBLIC_RETAIL_SURFACE?.trim().toLowerCase() === 'internal';
async function exists(path: string) { try { await access(path); return true; } catch { return false; } }
async function collect(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? collect(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}

assert.equal(await exists(join(out, 'index.html')), true);
for (const route of ['careers', 'candidate', 'verify-interview', 'admin/recruitment']) {
  assert.equal(await exists(join(out, route, 'index.html')), false, `Recruitment route exported: ${route}`);
}
assert.equal(await exists(join(out, 'track-order', 'index.html')), true);
assert.equal(await exists(join(out, 'policies', 'index.html')), true);

const robots = await readFile(join(out, 'robots.txt'), 'utf8');
assert.match(robots, /Disallow: .*\/admin\//, 'Admin must be excluded from crawling.');

const files = (await collect(out)).filter((path) => /\.(html|txt|json|js|xml)$/.test(path));
let combined = '';
for (const file of files) combined += await readFile(file, 'utf8');
const renderedFiles = files.filter((path) => !path.endsWith('.js'));
let rendered = '';
for (const file of renderedFiles) rendered += await readFile(file, 'utf8');

for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'candidate_registration_intents']) {
  assert.equal(combined.includes(forbidden), false, `Static output exposes forbidden marker: ${forbidden}`);
}

if (internal) {
  assert.equal(await exists(join(out, 'shop', 'index.html')), true);
  assert.equal(await exists(join(out, 'images', 'products')), true);
} else {
  assert.equal(await exists(join(out, 'images', 'products')), false, 'Public export must remove sample product assets.');
  assert.equal(await exists(join(out, 'shop', '__retail-disabled-build__')), false);
  const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8');
  assert.equal(sitemap.includes('/shop/'), false, 'Public sitemap must not advertise Shop.');
  assert.equal(rendered.includes('SAMPLE PRODUCT'), false, 'Public rendered output must not serialize sample product labels.');
  assert.equal(combined.includes('SAMPLE Desk Nameplate'), false, 'Public export must not contain sample product records.');
  assert.equal(rendered.includes('sample-nameplate.svg'), false, 'Public rendered output must not reference sample product media.');
}

console.log(`Stage 1 static-output tests passed (${internal ? 'internal' : 'public'} retail surface).`);
