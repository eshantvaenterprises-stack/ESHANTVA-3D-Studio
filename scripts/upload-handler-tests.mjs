import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { validateUpload, readPrefix } from '../supabase/functions/_shared/uploadValidation.ts';

// Execute the actual dispatchers with local Auth/Data API/Storage doubles. No network.
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const encode = text => new TextEncoder().encode(text);
let passed = 0;
async function exercise(mode, extension, object, options = {}) {
  const changes = [], removals = [], queries = [];
  let handler;
  const row = { id: fileId, file_extension: extension, storage_path: `${userId}/${requestId}/${fileId}${extension}`, size_bytes: options.size ?? object.length };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from(table) {
      const filters = {};
      let update;
      const result = () => ({ data: options.notOwned ? null : table.endsWith('_files') ? row : { id: requestId, status: 'DRAFT' }, error: null });
      const chain = {
        select() { return chain; }, eq(k, v) { filters[k] = v; return chain; },
        update(value) { update = value; return chain; },
        insert: async () => ({ error: null }),
        single: async () => { queries.push({ table, filters }); return result(); },
        then(resolve, reject) { if (update) changes.push(update); return Promise.resolve({ error: null }).then(resolve, reject); },
      };
      return chain;
    },
    storage: { from: () => ({ remove: async paths => { removals.push(...paths); return { error: null }; } }) },
  };
  const source = fs.readFileSync(`supabase/functions/${mode}-request-api/index.ts`, 'utf8');
  assert.match(source, /npm:zod@4\.6\.7/);
  const code = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInNewContext(code, {
    z, validateUpload, readPrefix, createClient: () => client,
    Deno: { serve(fn) { handler = fn; }, env: { get: key => ({ SUPABASE_URL: 'https://storage.test', SUPABASE_PUBLISHABLE_KEY: 'test', SUPABASE_SECRET_KEY: 'test', RATE_LIMIT_SALT: 'test', BULK_CATALOG_MODE: 'live' })[key] || '' } },
    fetch: async (url, init) => {
      if (url.includes('/info/')) return Response.json({ size: options.metadata ?? object.length });
      if (options.unreadable) return new Response(null, { status: 404 });
      const range = /bytes=(\d+)-(\d+)/.exec(init.headers.Range || '');
      if (range && !options.ignoreRange) {
        const start = Number(range[1]), end = Math.min(Number(range[2]), object.length - 1);
        return new Response(object.slice(start, end + 1), { status: 206, headers: options.noSize ? {} : { 'content-range': `bytes ${start}-${end}/${object.length}` } });
      }
      return new Response(object, { headers: { 'content-length': String(object.length) } });
    },
    Response, Request, TextEncoder, TextDecoder, Uint8Array, crypto, console,
  });
  const response = await handler(new Request('https://functions.test', { method: 'POST', headers: { authorization: 'Bearer local-test', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'finalize-upload', requestId, fileId }) }));
  assert.equal(response.status, options.notOwned ? 404 : options.reject || options.unreadable ? 400 : 200);
  if (options.reject) {
    assert.equal(changes.at(-1)?.upload_status, 'REJECTED');
    assert.deepEqual(removals, [row.storage_path]);
  } else if (!options.notOwned && !options.unreadable) {
    assert.equal(changes.at(-1)?.upload_status, 'READY');
    assert.equal(removals.length, 0);
  } else assert.equal(changes.length, 0);
  assert.ok(queries.every(q => q.filters.customer_id === userId));
  if (options.signature) assert.equal(changes.at(-1).signature_status, options.signature);
  passed++;
  console.log('PASS', mode, extension, JSON.stringify(options));
}
for (const mode of ['custom', 'bulk']) {
  const gltf = encode(JSON.stringify({ asset: { version: '2.0' }, extras: 'x'.repeat(12000) }));
  await exercise(mode, '.gltf', gltf);
  const late = encode(JSON.stringify({ extras: 'x'.repeat(9 * 1024 * 1024), asset: { version: '2.0' } }));
  await exercise(mode, '.gltf', late);
  await exercise(mode, '.gltf', late.slice(0, -1), { reject: true });
  await exercise(mode, '.gltf', encode('{"asset":{"version":"2.0"},"asset":null}'), { reject: true });
  await exercise(mode, '.gltf', gltf, { ignoreRange: true });
  await exercise(mode, '.gltf', gltf, { noSize: true });
  await exercise(mode, '.gltf', gltf.slice(0, -1), { reject: true });
  await exercise(mode, '.gltf', gltf, { size: gltf.length + 1, reject: true });
  await exercise(mode, '.stl', new Uint8Array(1024), { reject: true });
  const stl = new Uint8Array(134); new DataView(stl.buffer).setUint32(80, 1, true);
  await exercise(mode, '.stl', stl, { signature: 'UNVERIFIED_ALLOWED' });
  await exercise(mode, '.pdf', encode('%PDF-1.7 test'), { notOwned: true });
  await exercise(mode, '.pdf', encode('%PDF-1.7 test'), { unreadable: true });
}
await exercise('bulk', '.csv', encode('name,value\nAlice,plain'));
await exercise('bulk', '.csv', encode('name,value\nAlice,=1+1'), { reject: true });
await exercise('bulk', '.csv', encode('name,value\nAlice,plain'), { size: 1, reject: true });
console.log(`UPLOAD_HANDLER_TESTS_PASS=${passed}`);
