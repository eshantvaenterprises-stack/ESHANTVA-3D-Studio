import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

// Execute local and captured handlers against identical local-only boundaries.
// Captured npm imports are substituted by installed SDK doubles/Zod, so this
// does not certify deployed dependency resolution or full behavioural parity.
const origin = 'https://synthetic.example.invalid';
const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
let checks = 0;
for (const slug of ['custom-request-api', 'bulk-request-api', 'contact-request-api', 'checkout-order-api', 'customer-dashboard-api', 'admin-api', 'admin-artifact-api']) {
  for (const captured of [false, true]) {
    const file = captured ? `../backend/edge-functions/${slug}/deployed-source/index.ts` : `supabase/functions/${slug}/index.ts`;
    const source = fs.readFileSync(file, 'utf8').replace(/^import[^\n]+\r?\n/gm, '');
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
    let handler, currentUser = null;
    const queries = [];
    const client = { auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) }, from(table) {
      const filters = {};
      const result = () => { queries.push({ table, filters }); return { data: null, error: null }; };
      const chain = { select() { return chain; }, eq(k, v) { filters[k] = v; return chain; }, single: async () => result(), maybeSingle: async () => result() };
      return chain;
    } };
    vm.runInNewContext(code, { z, createClient: () => client, Deno: { serve(fn) { handler = fn; }, env: { get: key => key.endsWith('_ALLOWED_ORIGINS') ? origin : ({ SUPABASE_URL: 'https://storage.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic', SUPABASE_SECRET_KEY: 'synthetic', RATE_LIMIT_SALT: 'synthetic', BULK_CATALOG_MODE: 'live' })[key] || '' } }, Response, Request, URL, TextEncoder, TextDecoder, Uint8Array, crypto, console });
    async function call(method, requestOrigin = origin, payload = {}) {
      const response = await handler(new Request('https://function.invalid', { method, headers: { origin: requestOrigin, 'content-type': 'application/json', authorization: 'Bearer synthetic' }, ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}) }));
      return response;
    }
    assert.equal((await call('OPTIONS')).status, 204); checks++;
    assert.equal((await call('OPTIONS', 'https://foreign.invalid')).status, 403); checks++;
    assert.equal((await call('GET')).status, 405); checks++;
    assert.equal((await call('POST')).status, slug.startsWith('admin-') ? 403 : 401, `${slug} captured=${captured} unauthenticated`); checks++;
    if (slug === 'customer-dashboard-api') {
      currentUser = { id: userId, is_anonymous: true };
      assert.equal((await call('POST', origin, { action: 'dashboard-overview' })).status, 403); checks++;
      currentUser = { id: userId, is_anonymous: false };
      const denied = await call('POST', origin, { action: 'order-detail', reference: 'ESHA-2026-ABC12345', customerId: 'forged-owner' });
      assert.equal(denied.status, 404);
      assert.ok(queries.some(q => q.table === 'orders' && q.filters.customer_id === userId)); checks++;
    }
    if (slug === 'admin-api' || slug === 'admin-artifact-api') {
      currentUser = { id: userId, email: 'claims-admin@example.invalid', user_metadata: { role: 'ADMIN' } };
      assert.equal((await call('POST', origin, { action: 'order-overview' })).status, 403); checks++;
      assert.ok(queries.some(q => q.table === 'admin_users')); checks++;
    }
  }
}
console.log(`EDGE_BOUNDARY_PARITY_TESTS_PASS=${checks}; local/captured dispatchers with mocked Auth/Data API; full semantic/runtime parity NOT_PROVEN`);
