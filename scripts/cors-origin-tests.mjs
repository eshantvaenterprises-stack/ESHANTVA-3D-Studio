import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
let checks = 0;
for (const slug of ['custom-request-api', 'bulk-request-api', 'contact-request-api', 'checkout-order-api', 'customer-dashboard-api', 'admin-api', 'admin-artifact-api', 'website-features-api']) {
  const source = fs.readFileSync(`supabase/functions/${slug}/index.ts`, 'utf8').replace(/^import[^\n]+\r?\n/gm, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  let handler;
  vm.runInNewContext(code, { z, createClient() { throw Error('CORS must reject before database access'); }, Deno: { serve(fn) { handler = fn; }, env: { get: key => key.endsWith('_ALLOWED_ORIGINS') ? 'https://allowed.example.invalid' : '' } }, Response, Request, URL, TextEncoder, TextDecoder, Uint8Array, crypto, console });
  for (const method of ['OPTIONS', 'POST']) {
    const response = await handler(new Request('https://function.invalid', { method, headers: { origin: 'https://foreign.example.invalid', 'content-type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) }));
    assert.equal(response.status, 403, slug);
    assert.ok(!response.headers.get('access-control-allow-origin'), `${slug} must not allow a rejected origin`);
    checks++;
  }
  const allowed = await handler(new Request('https://function.invalid', { method: 'OPTIONS', headers: { origin: 'https://allowed.example.invalid' } }));
  assert.equal(allowed.status, 204, slug);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example.invalid', slug);
  checks++;
}
console.log(`CORS_ORIGIN_TESTS_PASS=${checks}; rejected origins receive no access grant; allowed preflights preserved`);
