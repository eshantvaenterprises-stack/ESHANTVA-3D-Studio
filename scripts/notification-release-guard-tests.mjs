import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync('supabase/functions/_shared/configuredNotification.ts', 'utf8').replace(/^import[^\n]+\r?\n/gm, '').replace('export function configuredNotificationDelivery', 'function configuredNotificationDelivery');
const code = ts.transpileModule(source + '\nglobalThis.factory = configuredNotificationDelivery;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
let checks = 0;
for (const setting of ['', 'smtp_tls']) {
  let envReads = 0, tlsCalls = 0, ledgerCalls = 0, transportCalls = 0;
  const sandbox = { Deno: { env: { get() { envReads++; return setting; } }, connectTls() { tlsCalls++; throw Error('forbidden'); } }, createSmtpTlsTransport() { transportCalls++; throw Error('forbidden'); }, withNotificationLedger() { ledgerCalls++; throw Error('forbidden'); } };
  vm.runInNewContext(code, sandbox);
  const admin = { rpc() { ledgerCalls++; throw Error('forbidden'); } };
  assert.equal(sandbox.factory(admin), undefined);
  assert.equal(envReads + tlsCalls + ledgerCalls + transportCalls, 0, 'Deferred release must not read SMTP config or touch SQL/network');
  checks++;
}
console.log(`NOTIFICATION_RELEASE_GUARD_PASS=${checks}; OPEN-10 DEFERRED_NOT_PASS; Gmail Auth untouched`);
