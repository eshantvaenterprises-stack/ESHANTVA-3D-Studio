import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

function load(slug, captured, exports) {
  const path = captured ? `../backend/edge-functions/${slug}/deployed-source/index.ts` : `supabase/functions/${slug}/index.ts`;
  const source = fs.readFileSync(path, 'utf8').replace(/^import[^\n]+\r?\n/gm, '') + `\nglobalThis.subject = {${exports}};`;
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const sandbox = { z, Deno: { serve() {}, env: { get() { return ''; } } }, Response, TextEncoder, console };
  vm.runInNewContext(code, sandbox); return sandbox.subject;
}
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const product = { product_id: 'synthetic-1', slug: 'synthetic-product', sku: 'TEST', title: 'Local fixture', currency: 'INR', base_unit_price_paise: 1000, active: true, purchasable: true, is_sample: false, public_availability: 'available', order_mode: 'buy_now', minimum_quantity: 1, maximum_quantity: 10, configuration_schema: [], tax_rate_bps: 0, price_includes_tax: false, catalog_version: 1 };
const line = { productId: product.product_id, slug: product.slug, configurationSignature: `${product.product_id}:[]`, quantity: 2, selectedOptions: [] };
const commerce = row => ({ from() { return { select() { return { in: async () => ({ data: [row], error: null }) }; } }; } });
const local = load('checkout-order-api', false, 'resolveCart,resolveTotals');
const captured = load('checkout-order-api', true, 'resolveCart,resolveTotals');
const a = await local.resolveCart(commerce(product), [line]), b = await captured.resolveCart(commerce(product), [line]);
assert.deepEqual(plain(a), plain(b)); checks++;
assert.deepEqual(plain(await local.resolveTotals(a, 'pickup', null)), plain(await captured.resolveTotals(b, 'pickup', null))); checks++;
for (const mutation of [{ is_sample: true }, { active: false }, { purchasable: false }, { order_mode: 'request_only' }, { public_availability: 'out_of_stock' }]) {
  for (const subject of [local, captured]) await assert.rejects(subject.resolveCart(commerce({ ...product, ...mutation }), [line]), error => error.code === 'CART_REVIEW_REQUIRED');
  checks++;
}
// A genuine semantic difference: local validates option discriminants; captured
// productSchema uses z.any(). Preserve the stricter working local revision.
const malformed = { ...product, configuration_schema: [{ id: 'invalid', label: 'Invalid', type: 'unknown', required: false }] };
await assert.rejects(local.resolveCart(commerce(malformed), [line]), error => error instanceof z.ZodError);
assert.equal((await captured.resolveCart(commerce(malformed), [line]))[0].lineSubtotalPaise, 2000); checks++;

const user = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', email: 'synthetic@example.invalid', user_metadata: {} };
const emptyClient = { from() { const chain = { select() { return chain; }, eq() { return chain; }, neq() { return chain; }, not() { return chain; }, gte() { return chain; }, in() { return chain; }, order() { return chain; }, limit() { return chain; }, maybeSingle: async () => ({ data: { id: 'internal-order-fixture' }, error: null }), then(resolve, reject) { return Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject); } }; return chain; } };
const dl = load('customer-dashboard-api', false, 'overview:dashboardOverview,files:orderFilesOverview');
const dc = load('customer-dashboard-api', true, 'overview:dashboard,files:filesOverview');
for (const action of ['overview', 'files']) {
  const responses = [];
  for (const subject of [dl, dc]) {
    const response = action === 'overview' ? await subject.overview(emptyClient, user, null) : await subject.files(emptyClient, user.id, { reference: 'ESHA-2026-ABC12345' }, null);
    assert.equal(response.status, 200); responses.push(await response.json());
  }
  assert.deepEqual(responses[0], responses[1]); checks++;
}
console.log(`EDGE_SEMANTIC_PARITY_TESTS_PASS=${checks}; valid checkout/empty dashboard/files match; stricter local Checkout option schema deliberately retained; broader parity NOT_PROVEN`);
