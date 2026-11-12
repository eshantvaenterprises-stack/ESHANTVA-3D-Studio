/** Edge-only request parsing. Bound bytes before decoding or allocating a full body string. */
export async function readWebsiteJson(request: Request, maxBytes = 18000): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('INVALID_INPUT');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new Error('INVALID_INPUT');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_INPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('INVALID_INPUT'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let decoded: unknown;
  try {
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    decoded = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  } catch { throw new Error('INVALID_INPUT'); }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('INVALID_INPUT');
  return decoded as Record<string, unknown>;
}
