import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { validateUpload, parseContentRange, type ByteRange } from '../supabase/functions/_shared/uploadValidation.ts';
import { JsonStreamValidator, validateJsonBytes } from '../supabase/functions/_shared/jsonStream.ts';

type Mode = 'range' | 'ignore-range' | 'no-content-range' | 'wrong-total';
const enc = (text: string) => new TextEncoder().encode(text);
let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) { await fn(); passed += 1; console.log('PASS', name); }

/** Storage emulator honouring RFC 9110 semantics. `mode` reproduces Storage/CDN edge cases. */
function storage(object: Uint8Array, mode: Mode = 'range', info: number | null = null) {
  const calls: Array<ByteRange | null> = [];
  const read = async (range: ByteRange | null) => {
    calls.push(range);
    if (!range || mode === 'ignore-range') return new Response(new Uint8Array(object), { status: 200, headers: { 'content-length': String(object.length) } });
    const end = Math.min(range.end, object.length - 1);
    const headers: Record<string, string> = { 'content-length': String(end - range.start + 1) };
    if (mode !== 'no-content-range') headers['content-range'] = `bytes ${range.start}-${end}/${mode === 'wrong-total' ? object.length + 7 : object.length}`;
    return new Response(object.slice(range.start, end + 1), { status: 206, headers });
  };
  return { read, calls, metadataSize: async () => info };
}
const run = (extension: string, bytes: Uint8Array, mode: Mode = 'range', info: number | null = null) => {
  const s = storage(bytes, mode, info);
  return validateUpload({ extension, read: s.read, metadataSize: s.metadataSize }).then((result) => ({ result, calls: s.calls }));
};

function binaryStl(triangles: number) {
  const out = new Uint8Array(84 + triangles * 50);
  out.set(enc('binary header, does not start with the S word'));
  new DataView(out.buffer).setUint32(80, triangles, true);
  return out;
}
const asciiStl = enc('solid cube\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid cube\n');
// Binary STL whose 80-byte header starts with "solid" (common exporter behaviour) must still pass by exact size.
function binaryStlSolidHeader(triangles: number) { const out = binaryStl(triangles); out.set(enc('solid exported by CAD')); return out; }

function glb(version = 2, lieAboutLength = false) {
  const json = enc('{"asset":{"version":"2.0"}}  ');
  const out = new Uint8Array(20 + json.length);
  const dv = new DataView(out.buffer);
  out.set(enc('glTF')); dv.setUint32(4, version, true); dv.setUint32(8, out.length + (lieAboutLength ? 4 : 0), true);
  dv.setUint32(12, json.length, true); dv.setUint32(16, 0x4e4f534a, true); out.set(json, 20);
  return out;
}

function crc32(data: Uint8Array) { let c, crc = 0xffffffff; for (const byte of data) { c = (crc ^ byte) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function zip(entries: Array<[string, string]>, opts: { truncateTail?: boolean; comment?: string; store?: boolean } = {}) {
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const [name, content] of entries) {
    const data = enc(content); const packed = opts.store ? data : deflateRawSync(data); const nm = enc(name);
    const local = new Uint8Array(30 + nm.length); const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, opts.store ? 0 : 8, true); dv.setUint32(14, crc32(data), true);
    dv.setUint32(18, packed.length, true); dv.setUint32(22, data.length, true); dv.setUint16(26, nm.length, true); local.set(nm, 30);
    const cd = new Uint8Array(46 + nm.length); const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(10, opts.store ? 0 : 8, true); cv.setUint32(16, crc32(data), true);
    cv.setUint32(20, packed.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nm.length, true); cv.setUint32(42, offset, true); cd.set(nm, 46);
    parts.push(local, packed); central.push(cd); offset += local.length + packed.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0); const comment = enc(opts.comment || '');
  const eocd = new Uint8Array(22 + comment.length); const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, comment.length, true); eocd.set(comment, 22);
  const all = [...parts, ...central, eocd]; const total = all.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(total); let at = 0;
  for (const p of all) { out.set(p, at); at += p.length; }
  return opts.truncateTail ? out.subarray(0, out.length - 30) : out;
}
const model3mf = () => zip([['[Content_Types].xml', '<Types/>'], ['_rels/.rels', '<Relationships/>'], ['3D/3dmodel.model', '<model unit="millimeter"/>']]);

function gltfDoc(size: number) {
  const item = '{"bufferView":1,"componentType":5126,"count":100,"type":"VEC3"}';
  const items: string[] = []; let len = 60;
  while (len < size) { items.push(item); len += item.length + 1; }
  return enc(`{"asset":{"version":"2.0","generator":"fixture"},"accessors":[${items.join(',')}]}`);
}

// ---------- D-01 glTF: full-document validation ----------
await test('D-01 small glTF accepted (FULL)', async () => {
  const { result } = await run('.gltf', enc('{"asset":{"version":"2.0"},"scenes":[]}'));
  assert.equal(result.ok, true); assert.equal(result.ok && result.verification, 'FULL');
});
await test('D-01 regression: glTF larger than 1 KB accepted (was rejected from the 1 KB prefix)', async () => {
  const doc = gltfDoc(4000); assert.ok(doc.length > 3900);
  assert.equal((await run('.gltf', doc)).result.ok, true);
});
await test('D-01 multi-MB glTF streamed and accepted', async () => {
  const doc = gltfDoc(6 * 1024 * 1024); const { result, calls } = await run('.gltf', doc);
  assert.equal(result.ok, true); assert.ok(calls.some((c) => c === null), 'full read performed');
});
await test('D-01 glTF truncated mid-document is rejected (old regex accepted this)', async () => {
  const doc = gltfDoc(20000); assert.equal((await run('.gltf', doc.subarray(0, doc.length - 40))).result.ok, false);
});
await test('D-01 glTF with valid head but corrupt tail rejected', async () => {
  // Last bytes are `..."VEC3"}]}`: turn the closing brace of the final accessor into a comma -> `"VEC3",]}` (invalid JSON).
  const doc = gltfDoc(20000).slice(); assert.equal(doc[doc.length - 3], 0x7d); doc[doc.length - 3] = 0x2c;
  assert.throws(() => JSON.parse(new TextDecoder().decode(doc)));
  assert.equal((await run('.gltf', doc)).result.ok, false);
});
await test('D-01 glTF without asset.version rejected', async () => {
  assert.equal((await run('.gltf', enc('{"scenes":[]}'))).result.ok, false);
  assert.equal((await run('.gltf', enc('{"asset":{"generator":"x"}}'))).result.ok, false);
  assert.equal((await run('.gltf', enc('{"asset":"2.0"}'))).result.ok, false);
});
await test('D-01 glTF array / non-JSON / invalid UTF-8 rejected', async () => {
  assert.equal((await run('.gltf', enc('[1,2,3]'))).result.ok, false);
  assert.equal((await run('.gltf', enc('hello'))).result.ok, false);
  assert.equal((await run('.gltf', new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]))).result.ok, false);
});
await test('D-01 JSON validator agrees with JSON.parse on 20,000 mutated documents', () => {
  const seed = '{"asset":{"version":"2.0"},"a":[1,2.5,-3e2,"s\\"q",null,true,{"k":[]}],"b":{"c":"d"}}';
  let state = 1; const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  const alphabet = '{}[]:,"0-e. tf\\x'; let mismatches = 0;
  for (let i = 0; i < 20000; i += 1) {
    const s = seed.split('');
    for (let k = 0; k < 1 + (i % 3); k += 1) {
      const p = Math.floor(rnd() * s.length); const op = Math.floor(rnd() * 3); const ch = alphabet[Math.floor(rnd() * alphabet.length)];
      if (op === 0) s[p] = ch; else if (op === 1) s.splice(p, 1); else s.splice(p, 0, ch);
    }
    const text = s.join(''); let expected = false;
    try { const value = JSON.parse(text); expected = value !== null && typeof value === 'object' && !Array.isArray(value); } catch { expected = false; }
    if (expected !== validateJsonBytes(enc(text)).valid) mismatches += 1;
  }
  assert.equal(mismatches, 0);
});
await test('D-01 JSON validator is chunk-boundary independent (1-byte chunks, multibyte UTF-8)', () => {
  const v = new JsonStreamValidator();
  for (const b of enc('{"asset":{"version":"2.0"},"n":"h\u00e9llo \u2713 \ud83d\ude00"}')) v.pushBytes(Uint8Array.of(b));
  const r = v.finish(); assert.equal(r.valid, true); assert.equal(r.assetVersion, '2.0');
});
await test('D-01 JSON validator depth bomb rejected without stack overflow', () => {
  assert.equal(validateJsonBytes(enc('{"a":' + '['.repeat(100000))).valid, false);
});


// ---------- D-02 size semantics ----------
await test('D-02 size from 206 Content-Range total', async () => {
  const { result } = await run('.pdf', enc('%PDF-1.7 body'));
  assert.equal(result.ok && result.totalSize, 13);
});
await test('D-02 HTTP 200 (Range ignored) uses Content-Length, not the declared size', async () => {
  const { result } = await run('.pdf', enc('%PDF-1.7 body'), 'ignore-range');
  assert.equal(result.ok && result.totalSize, 13);
});
await test('D-02 missing Content-Range falls back to Storage metadata, never a client value', async () => {
  const withInfo = await run('.pdf', enc('%PDF-1.7 body'), 'no-content-range', 13);
  assert.equal(withInfo.result.ok && withInfo.result.totalSize, 13);
  const none = await run('.pdf', enc('%PDF-1.7 body'), 'no-content-range', null);
  assert.equal(none.result.ok, false); assert.equal(!none.result.ok && none.result.code, 'SIZE_UNVERIFIABLE');
});
await test('D-02 parseContentRange rejects malformed, unknown-total and inverted values', () => {
  for (const bad of [null, '', 'bytes */100', 'bytes 5-2/100', 'bytes 0-100/100', 'items 0-1/2', 'bytes 0-1/x']) assert.equal(parseContentRange(bad), null);
  assert.deepEqual(parseContentRange('bytes 0-8191/5000000'), { start: 0, end: 8191, total: 5000000 });
});
await test('D-02 caller contract: authoritative total differs from a forged declared size', async () => {
  const { result } = await run('.pdf', enc('%PDF-1.7 body'));
  assert.ok(result.ok && result.totalSize !== 999);
});

// ---------- STL ----------
await test('STL binary with exact size accepted', async () => { assert.equal((await run('.stl', binaryStl(100))).result.ok, true); });
await test('STL binary whose header begins with "solid" accepted by exact size', async () => { assert.equal((await run('.stl', binaryStlSolidHeader(100))).result.ok, true); });
await test('STL ASCII with facets accepted', async () => { assert.equal((await run('.stl', asciiStl)).result.ok, true); });
await test('STL "solid" text without facets rejected', async () => { assert.equal((await run('.stl', enc('solid hello world, this is not a mesh at all'))).result.ok, false); });
await test('STL arbitrary 1,024 bytes rejected (was accepted)', async () => {
  const noise = new Uint8Array(1024).map((_, i) => (i * 31 + 7) & 0xff); noise.fill(0, 80, 84); noise[80] = 1;
  assert.equal((await run('.stl', noise)).result.ok, false);
});
await test('STL binary with wrong triangle count or truncated rejected', async () => {
  const bin = binaryStl(100);
  assert.equal((await run('.stl', bin.subarray(0, bin.length - 10))).result.ok, false);
  assert.equal((await run('.stl', new Uint8Array(84))).result.ok, false);
});

// ---------- GLB / 3MF / OBJ / STEP / images / PDF ----------
await test('GLB v2 accepted; length lie, bad version, truncated rejected', async () => {
  assert.equal((await run('.glb', glb())).result.ok, true);
  assert.equal((await run('.glb', glb(2, true))).result.ok, false);
  assert.equal((await run('.glb', glb(7))).result.ok, false);
  assert.equal((await run('.glb', glb().subarray(0, 10))).result.ok, false);
});
await test('3MF valid OPC package accepted via tail range read', async () => {
  const pkg = model3mf(); const { result, calls } = await run('.3mf', pkg);
  assert.equal(result.ok, true); assert.ok(calls.length >= 2, 'tail was read');
});
await test('3MF: ZIP without 3D model part, truncated central directory, arbitrary PK bytes rejected', async () => {
  assert.equal((await run('.3mf', zip([['readme.txt', 'x']]))).result.ok, false);
  assert.equal((await run('.3mf', model3mf().subarray(0, model3mf().length - 30))).result.ok, false);
  assert.equal((await run('.3mf', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]))).result.ok, false);
});
await test('3MF with ZIP comment still accepted', async () => {
  const pkg = zip([['[Content_Types].xml', '<Types/>'], ['3D/3dmodel.model', '<model/>']], { comment: 'exported by test' });
  assert.equal((await run('.3mf', pkg)).result.ok, true);
});
await test('OBJ accepted; binary data rejected', async () => {
  assert.equal((await run('.obj', enc('# Blender\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'))).result.ok, true);
  assert.equal((await run('.obj', new Uint8Array([0, 1, 2, 3, 118, 32]))).result.ok, false);
});
await test('STEP accepted (incl. BOM); wrong magic rejected', async () => {
  assert.equal((await run('.step', enc('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n'))).result.ok, true);
  assert.equal((await run('.stp', enc('\uFEFFISO-10303-21;\nHEADER;'))).result.ok, true);
  assert.equal((await run('.step', enc('hello ISO-10303-21 later'))).result.ok, false);
});
await test('PNG / JPEG / PDF signatures preserved', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert.equal((await run('.png', png)).result.ok, true);
  assert.equal((await run('.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).result.ok, true);
  assert.equal((await run('.jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).result.ok, true);
  assert.equal((await run('.pdf', enc('%PDF-1.4\n'))).result.ok, true);
  assert.equal((await run('.png', enc('GIF89a....'))).result.ok, false);
  assert.equal((await run('.pdf', enc('<html>'))).result.ok, false);
});
await test('Unapproved extensions (.blend/.fbx/.dae/.exe) are not accepted by the validator', async () => {
  for (const ext of ['.blend', '.fbx', '.dae', '.exe', '.zip']) assert.equal((await run(ext, enc('BLENDER-v300 data'))).result.ok, false);
});
await test('Unreadable object (404) is OBJECT_UNREADABLE', async () => {
  const result = await validateUpload({ extension: '.pdf', read: async () => new Response('nope', { status: 404 }) });
  assert.equal(!result.ok && result.code, 'OBJECT_UNREADABLE');
});

await test('glTF accepts escaped JSON metadata keys and version', async () => {
  const { result } = await run('.gltf', enc('{"ass\\u0065t":{"version":"2\\u002e0"}}'));
  assert.equal(result.ok, true);
});
await test('3MF larger than 8 MiB survives ignored Range with bounded tail retention', async () => {
  const pkg = zip([['filler.bin', 'x'.repeat(9 * 1024 * 1024)], ['[Content_Types].xml', '<Types/>'], ['3D/3dmodel.model', '<model/>']], { store: true });
  assert.ok(pkg.length > 8 * 1024 * 1024);
  assert.equal((await run('.3mf', pkg, 'ignore-range')).result.ok, true);
});
console.log(`UPLOAD_VALIDATION_TESTS_PASS=${passed}`);

