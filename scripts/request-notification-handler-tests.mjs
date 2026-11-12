import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { sendCustomRequestConfirmation, sendBulkRequestConfirmation } from '../supabase/functions/_shared/notification.ts';

// Reuse existing legitimate request fixtures, executing actual submission handlers.
function fixture(mode) {
  const source = fs.readFileSync(`scripts/${mode}-order-tests.ts`, 'utf8');
  const ast = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.filter(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['valid', 'catalogItem'].includes(d.name.getText(ast))));
  const code = ts.transpileModule(declarations.map(n => n.getText(ast)).join('\n') + '\nglobalThis.fixture = valid;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const sandbox = {}; vm.runInNewContext(code, sandbox);
  const value = JSON.parse(JSON.stringify(sandbox.fixture));
  if (mode === 'bulk') {
    value.catalogMode = 'live'; value.bulkType = 'custom_requirement';
    value.requirementTitle = 'Synthetic requirement'; value.requirementDescription = 'Synthetic custom requirement for a local-only test'; value.intendedUse = 'Local validation';
    value.items = value.items.map(item => ({ ...item, itemType: 'custom', productId: null, productSlug: null }));
  }
  return value;
}
let checks = 0;
for (const mode of ['custom', 'bulk']) for (const scenario of ['disabled', 'rejected', 'exception', 'commit-failed']) {
  let handler, commits = 0, sends = 0, notifications = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } }, error: null }) },
    from() {
      const chain = { select() { return chain; }, eq() { return chain; }, gte() { return chain; }, single: async () => ({ data: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'DRAFT' }, error: null }), insert: async () => ({ error: null }), then(resolve, reject) { return Promise.resolve({ count: 0, error: null }).then(resolve, reject); } };
      return chain;
    },
    rpc: async () => { commits++; return scenario === 'commit-failed' ? { error: { code: 'TEST_COMMIT_FAILED' } } : { data: '2026-11-11T00:00:00Z', error: null }; },
  };
  const send = mode === 'custom' ? sendCustomRequestConfirmation : sendBulkRequestConfirmation;
  const notify = async confirmation => {
    notifications++; assert.equal(commits, 1, 'Notification must follow committed submission');
    const delivery = scenario === 'disabled' ? undefined : { transport: { send: async () => { sends++; if (scenario === 'exception') throw new Error('synthetic SMTP private detail'); return { accepted: false, retryable: true }; } }, wait: async () => {} };
    return send(confirmation, delivery);
  };
  const source = fs.readFileSync(`supabase/functions/${mode}-request-api/index.ts`, 'utf8').replace(/^import[^\n]+\r?\n/gm, '');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInNewContext(code, {
    z, createClient: () => client, configuredNotificationDelivery: () => undefined, sendCustomRequestConfirmation: notify, sendBulkRequestConfirmation: notify,
    Deno: { serve(fn) { handler = fn; }, env: { get: key => ({ SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', RATE_LIMIT_SALT: 'test', BULK_CATALOG_MODE: 'live' })[key] || '' } },
    Response, Request, TextEncoder, crypto, console: { error() {} },
  });
  const response = await handler(new Request('https://function.invalid', { method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'submit-request', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', submission: fixture(mode) }) }));
  assert.equal(response.status, scenario === 'commit-failed' ? 500 : 200, `${mode}/${scenario}`);
  const result = await response.json();
  assert.equal(result.ok, scenario !== 'commit-failed');
  assert.equal(notifications, scenario === 'commit-failed' ? 0 : 1);
  assert.equal(sends, scenario === 'rejected' ? 3 : scenario === 'exception' ? 1 : 0);
  assert.ok(!JSON.stringify(result).includes('SMTP'));
  checks++;
}
console.log(`REQUEST_NOTIFICATION_HANDLER_TESTS_PASS=${checks}; mocked commit/delivery; no real recipients`);
