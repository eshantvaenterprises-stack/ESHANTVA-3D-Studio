import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Validate an ACTUAL Next.js output: never mark this PASS without a real `out/`.
const root = join(process.cwd(), 'out');
assert.ok(existsSync(root), 'BUILD_OUTPUT_MISSING: run the customer-only Next static build first');
const walk = (p) => readdirSync(p, { withFileTypes: true }).flatMap(
  (entry) => entry.isDirectory() ? walk(join(p, entry.name)) : [join(p, entry.name)],
);
const files = walk(root).map((p) => relative(root, p).split(sep).join('/'));
const excludedRoute = /^(?:careers|candidate|verify-interview|recruitment-privacy|recruitment-terms)\/|^admin\/recruitment\//i;
assert.deepEqual(files.filter((p) => excludedRoute.test(p)), [], 'Public output includes candidate route files');

const required = [
  'index.html', 'contact/index.html', 'custom-order/index.html',
  'bulk-order/index.html', 'account/index.html',
];
for (const p of required) assert.ok(files.includes(p), `Missing customer route ${p}`);
assert.ok(!files.some((p) => p.startsWith('images/products/')), 'Public product assets still shipped');

// A direct-link denial and client-bundle check must include one-segment legacy
// paths, not just the deeper activation/training endpoints.
if (files.includes('robots.txt')) {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  assert.doesNotMatch(robots, /(?:careers|candidate|verify-interview|admin\/recruitment|recruitment-privacy|recruitment-terms)/i, 'Robots advertises retired candidate URLs');
}
const staticTextFiles = files.filter((p) => /\.(?:html|js|mjs|css|json|xml|txt|map)$/i.test(p) && p !== 'robots.txt');
const forbiddenClientArtifacts = [
  { code: 'CANDIDATE_ROUTE', re: /\/(?:candidate|careers|verify-interview|admin\/recruitment|recruitment-privacy|recruitment-terms)(?:\/|[?#\"'`])/i },
  { code: 'CANDIDATE_API', re: /(?:candidate-recruitment-api|admin-recruitment-api|recruitment-extended-admin-api|recruitment-files)/i },
  { code: 'CANDIDATE_STYLES', re: /\.(?:candidate-layout|candidate-form|recruit-grid|admin-recruit-table)\b/i },
  { code: 'SAMPLE_PRODUCT_DATA', re: /(?:SAMPLE-NAMEPLATE-001|SAMPLE-CABLE-002|SAMPLE-PLANTER-004|sample-desk-nameplate)/i },
];
for (const path of staticTextFiles) {
  const contents = readFileSync(join(root, path), 'utf8');
  // robots.txt may intentionally disallow legacy routes and is separately excluded above.
  for (const { code, re } of forbiddenClientArtifacts) {
    assert.doesNotMatch(contents, re, `${code} leak in generated public file ${path}`);
  }
  if (/\.(?:html|xml)$/i.test(path)) {
    assert.doesNotMatch(contents, /href=["'][^"']*\/(?:careers|candidate|verify-interview|admin\/recruitment|recruitment-privacy|recruitment-terms)(?:\/|["'])/i, `Recruitment HTML link in ${path}`);
  }
}
// Inspect clickable links as well as serialized client JS. Retail placeholder
// pages can exist, but public customer pages must not link into hidden retail.
for (const path of files.filter((p) => p.endsWith('.html') && !/^(?:shop|cart|checkout)\//.test(p))) {
  const html = readFileSync(join(root, path), 'utf8');
  assert.doesNotMatch(html, /<a\b[^>]*href=["'][^"']*\/(?:shop|cart|checkout)(?:\/|[?#"'])/i,
    `Hidden retail click-through in customer HTML ${path}`);
}
for (const p of ['shop/index.html', 'cart/index.html', 'checkout/index.html']) {
  if (!files.includes(p)) continue;
  const html = readFileSync(join(root, p), 'utf8');
  assert.match(html, /(unavailable|not available|not publicly available)/i, `${p}: hidden retail state missing`);
  assert.doesNotMatch(html, /application\/ld\+json[^]*?"@type":"Product"/i, `${p}: product structured-data leak`);
}
console.log(`CUSTOMER_ONLY_EXPORT_CONTRACT_PASS: ${files.length} generated files, ${staticTextFiles.length} public text assets inspected`);
