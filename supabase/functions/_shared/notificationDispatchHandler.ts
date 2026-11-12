// Dormant service entrypoint: gateway JWT verification remains enabled separately.
type DispatchResult = { enabled: boolean; selected: number; sent: number; unresolved: number };
type Options = { env: (name: string) => string | undefined; dispatch: (limit: number) => Promise<DispatchResult> };
const headers = { 'cache-control': 'no-store', 'content-type': 'application/json', 'x-content-type-options': 'nosniff' };
const reply = (status: number, code: string, extra = {}) => new Response(JSON.stringify({ code, ...extra }), { status, headers });
async function equal(a: string, b: string) {
  const hash = async (x: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)));
  const [x, y] = await Promise.all([hash(a), hash(b)]); let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}
export function createNotificationDispatchHandler({ env, dispatch }: Options) {
  return async (request: Request): Promise<Response> => {
    // No browser CORS, recipient payload or caller-controlled SMTP configuration.
    if (request.headers.has('origin')) return reply(403, 'FORBIDDEN');
    if (request.method !== 'POST') return reply(405, 'METHOD_NOT_ALLOWED');
    const service = env('SUPABASE_SERVICE_ROLE_KEY'); const secret = env('NOTIFICATION_DISPATCH_TOKEN');
    if (!service || !secret || secret.length < 32) return reply(503, 'DISPATCH_UNAVAILABLE');
    if (!await equal(request.headers.get('authorization') || '', 'Bearer ' + service) ||
        !await equal(request.headers.get('x-notification-dispatch-token') || '', secret)) return reply(403, 'FORBIDDEN');
    if (env('NOTIFICATION_DISPATCH_ENABLED') !== 'true' || env('NOTIFICATION_TRANSPORT') !== 'smtp_tls') return reply(200, 'DISPATCH_DISABLED', { enabled: false });
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return reply(415, 'JSON_REQUIRED');
    const declared = request.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 256)) return reply(413, 'BODY_TOO_LARGE');
    let value: unknown;
    try {
      const reader = request.body?.getReader(); let total = 0; const chunks: Uint8Array[] = [];
      if (reader) { try { while (true) { const item = await reader.read(); if (item.done) break; total += item.value.length; if (total > 256) { await reader.cancel(); return reply(413, 'BODY_TOO_LARGE'); } chunks.push(item.value); } } finally { reader.releaseLock(); } }
      const body = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
      value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
    } catch { return reply(400, 'INVALID_BODY'); }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'limit')) return reply(400, 'INVALID_BODY');
    const limit = (value as { limit?: unknown }).limit ?? 1;
    // Bound batch size; interrupted deliveries retain the ledger quarantine rules.
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 5) return reply(400, 'INVALID_LIMIT');
    try { return reply(200, 'DISPATCH_COMPLETE', await dispatch(Number(limit))); }
    catch { return reply(503, 'QUEUE_UNAVAILABLE'); }
  };
}
