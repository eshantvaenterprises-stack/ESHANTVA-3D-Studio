/**
 * Shared, dependency-free server-side validation of customer-uploaded request files.
 * Used by custom-request-api and bulk-request-api `finalize-upload`.
 *
 * Contracts preserved: same extension allow-list, same limits, same REJECTED/READY flow.
 * What changes: the authoritative object size now comes from HTTP semantics
 * (206 + Content-Range, or 200 + Content-Length) or Storage metadata - never from the
 * client-declared database value - and .gltf JSON is streamed and validated completely, including metadata after the prefix.
 *
 * NOTE: these checks verify container structure, not geometry. 3D files are still
 * `UNVERIFIED_ALLOWED` where the callers say so; no printability claim is made.
 */
import { JsonStreamValidator } from './jsonStream.ts';

export const HEAD_BYTES = 8192;
export const ZIP_TAIL_BYTES = 65536 + 22;

export type ByteRange = { start: number; end: number };
export type ObjectReader = (range: ByteRange | null) => Promise<Response>;
export type UploadCheckInput = {
  extension: string;
  read: ObjectReader;
  /** Optional authoritative size from Storage metadata, used only when HTTP headers carry no size. */
  metadataSize?: () => Promise<number | null>;
};
export type UploadCheckResult =
  | { ok: true; totalSize: number; verification: 'FULL' | 'STRUCTURAL' }
  | { ok: false; code: string; message: string };

const fail = (code: string, message: string): UploadCheckResult => ({ ok: false, code, message });

/** Parse `bytes a-b/total`. Returns null for malformed values or an unknown (`*`) total. */
export function parseContentRange(value: string | null): { start: number; end: number; total: number } | null {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec((value || '').trim());
  if (!match) return null;
  const [start, end, total] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (![start, end, total].every(Number.isSafeInteger) || start > end || end >= total) return null;
  return { start, end, total };
}

/** Read at most `limit` bytes from a response body and cancel the rest (never buffers a whole object). */
export async function readPrefix(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      length += value.length;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(Math.min(length, limit));
  let offset = 0;
  for (const chunk of chunks) {
    const take = Math.min(chunk.length, out.length - offset);
    if (take <= 0) break;
    out.set(chunk.subarray(0, take), offset);
    offset += take;
  }
  return out;
}

/**
 * Determine the total object size using correct range semantics:
 * 206 -> Content-Range total; 200 -> Range ignored, so Content-Length is the full size.
 */
export async function resolveTotalSize(response: Response, metadataSize?: () => Promise<number | null>): Promise<number | null> {
  if (response.status === 206) {
    const range = parseContentRange(response.headers.get('content-range'));
    if (range) return range.total;
  } else if (response.status === 200) {
    const length = response.headers.get('content-length');
    if (length !== null && /^\d+$/.test(length) && !response.headers.get('content-encoding')) return Number(length);
  }
  if (metadataSize) {
    const size = await metadataSize().catch(() => null);
    if (typeof size === 'number' && Number.isSafeInteger(size) && size >= 0) return size;
  }
  return null;
}

const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const hasNul = (bytes: Uint8Array) => bytes.includes(0);
const startsWith = (bytes: Uint8Array, ...values: number[]) => values.every((value, index) => bytes[index] === value);
const utf8 = (bytes: Uint8Array) => new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');

/** STL: binary (80-byte header + uint32 count + 50 B/triangle) by exact size; ASCII must show real facets. */
export function checkStl(head: Uint8Array, total: number): boolean {
  if (head.length >= 84) {
    const triangles = view(head).getUint32(80, true);
    if (triangles > 0 && 84 + triangles * 50 === total) return true;
  }
  if (hasNul(head)) return false;
  const text = utf8(head).trimStart();
  if (!/^solid\b/i.test(text)) return false;
  return /^\s*(facet\s+normal|endsolid)\b/im.test(text.slice(5));
}

export function checkObj(head: Uint8Array): boolean {
  if (hasNul(head)) return false;
  return /^(#|v\s|o\s|g\s|mtllib\s)/m.test(utf8(head).trimStart());
}

export function checkStep(head: Uint8Array): boolean {
  if (hasNul(head)) return false;
  return /^\s*ISO-10303-21\s*;/.test(utf8(head));
}

/** GLB container header: magic, version 1 or 2, declared length equals the real object size. */
export function checkGlb(head: Uint8Array, total: number): boolean {
  if (head.length < 12 || !startsWith(head, 0x67, 0x6c, 0x54, 0x46)) return false;
  const dv = view(head);
  const version = dv.getUint32(4, true);
  if ((version !== 1 && version !== 2) || dv.getUint32(8, true) !== total) return false;
  if (version === 2) {
    // First chunk must be JSON (0x4E4F534A) and fit inside the file.
    return head.length >= 20 && dv.getUint32(16, true) === 0x4e4f534a && 20 + dv.getUint32(12, true) <= total;
  }
  return true;
}

/** ZIP/OPC end-of-central-directory check for 3MF; confirms the mandatory OPC parts when visible. */
export function checkZipTail(tail: Uint8Array, tailStart: number, total: number): boolean {
  if (tail.length < 22) return false;
  const dv = view(tail);
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (dv.getUint32(i, true) !== 0x06054b50) continue;
    if (i + 22 + dv.getUint16(i + 20, true) !== tail.length) continue;
    const entries = dv.getUint16(i + 10, true);
    const size = dv.getUint32(i + 12, true);
    const offset = dv.getUint32(i + 16, true);
    if (entries === 0xffff || size === 0xffffffff || offset === 0xffffffff) return true; // ZIP64 structure accepted
    if (entries === 0 || offset + size > tailStart + i || tailStart + i + 22 > total) return false;
    const dirStart = offset - tailStart;
    if (dirStart < 0) return true; // central directory begins before the fetched window; EOCD is consistent
    const names: string[] = [];
    let cursor = dirStart;
    for (let n = 0; n < entries && cursor + 46 <= i; n += 1) {
      if (dv.getUint32(cursor, true) !== 0x02014b50) return false;
      const nameLength = dv.getUint16(cursor + 28, true);
      names.push(ascii(tail, cursor + 46, cursor + 46 + nameLength));
      cursor += 46 + nameLength + dv.getUint16(cursor + 30, true) + dv.getUint16(cursor + 32, true);
    }
    return names.length === entries && names.includes('[Content_Types].xml') && names.some((name) => /\.model$/i.test(name));
  }
  return false;
}


async function readTail(read: ObjectReader, total: number): Promise<{ bytes: Uint8Array; start: number } | null> {
  const start = Math.max(0, total - ZIP_TAIL_BYTES);
  const response = await read({ start, end: total - 1 });
  if (response.status === 206) {
    const range = parseContentRange(response.headers.get('content-range'));
    if (!range || range.start !== start || range.total !== total) { await response.body?.cancel(); return null; }
    return { bytes: await readPrefix(response, total - start), start };
  }
  if (response.status === 200 && response.body) {
    // A server may ignore Range even for a valid 50 MiB object. Retain only
    // the requested tail while streaming past the prefix, never the full ZIP.
    const tail = new Uint8Array(total - start);
    const reader = response.body.getReader();
    let seen = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (seen + value.length > total) return null;
        const skip = Math.max(0, start - seen);
        if (skip < value.length) tail.set(value.subarray(skip), Math.max(0, seen - start));
        seen += value.length;
      }
    } finally { await reader.cancel().catch(() => undefined); }
    return seen === total ? { bytes: tail, start } : null;
  }
  await response.body?.cancel();
  return null;
}

/** Stream the whole object through the JSON validator; the byte count must equal the authoritative size. */
async function validateWholeGltf(read: ObjectReader, total: number): Promise<boolean> {
  const response = await read(null);
  if (response.status !== 200 || !response.body) { await response.body?.cancel(); return false; }
  const validator = new JsonStreamValidator();
  const reader = response.body.getReader();
  let seen = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen += value.length;
      if (seen > total || !validator.pushBytes(value)) return false;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const result = validator.finish();
  return seen === total && result.valid && result.assetIsObject && result.assetVersion !== null && /^\d+\.\d+/.test(result.assetVersion);
}

/**
 * Validate one finalized upload. Never trusts the client-declared size: the caller compares
 * `totalSize` with the prepared `size_bytes` and rejects any difference.
 */
export async function validateUpload(input: UploadCheckInput): Promise<UploadCheckResult> {
  const { extension, read, metadataSize } = input;
  const headResponse = await read({ start: 0, end: HEAD_BYTES - 1 });
  if (headResponse.status !== 200 && headResponse.status !== 206) {
    await headResponse.body?.cancel();
    return fail('OBJECT_UNREADABLE', 'Uploaded object could not be verified.');
  }
  const total = await resolveTotalSize(headResponse, metadataSize);
  if (total === null || total < 1) {
    await headResponse.body?.cancel();
    return fail('SIZE_UNVERIFIABLE', 'Uploaded object size could not be verified.');
  }
  const head = await readPrefix(headResponse, HEAD_BYTES);
  const signatureFail = fail('SIGNATURE_MISMATCH', 'File signature does not match its extension.');
  const ok = (verification: 'FULL' | 'STRUCTURAL'): UploadCheckResult => ({ ok: true, totalSize: total, verification });
  switch (extension) {
    case '.png': return startsWith(head, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) ? ok('STRUCTURAL') : signatureFail;
    case '.jpg':
    case '.jpeg': return startsWith(head, 0xff, 0xd8, 0xff) ? ok('STRUCTURAL') : signatureFail;
    case '.pdf': return ascii(head, 0, 5) === '%PDF-' ? ok('STRUCTURAL') : signatureFail;
    case '.glb': return checkGlb(head, total) ? ok('STRUCTURAL') : signatureFail;
    case '.stl': return checkStl(head, total) ? ok('STRUCTURAL') : signatureFail;
    case '.obj': return checkObj(head) ? ok('STRUCTURAL') : signatureFail;
    case '.step':
    case '.stp': return checkStep(head) ? ok('STRUCTURAL') : signatureFail;
    case '.3mf': {
      if (!startsWith(head, 0x50, 0x4b, 0x03, 0x04)) return signatureFail;
      const tail = await readTail(read, total);
      return tail && checkZipTail(tail.bytes, tail.start, total) ? ok('STRUCTURAL') : signatureFail;
    }
    case '.gltf': {
      return await validateWholeGltf(read, total) ? ok('FULL') : signatureFail;
    }
    default: return signatureFail;
  }
}

