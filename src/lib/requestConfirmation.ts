type RequestConfirmation = { publicRequestId: string; submittedAt: string; summary: string };
const transientConfirmations = new Map<string, string>();

// Keep only the accepted public receipt in memory if this tab cannot persist it.
// It intentionally disappears on a full reload rather than storing customer data elsewhere.
export function writeSessionConfirmation(key: string, value: { publicRequestId: string; submittedAt: string; summary?: string }) {
  const raw = JSON.stringify({ publicRequestId: value.publicRequestId, submittedAt: value.submittedAt, ...(value.summary === undefined ? {} : { summary: value.summary }) });
  try {
    sessionStorage.setItem(key, raw);
    transientConfirmations.delete(key);
  } catch { transientConfirmations.set(key, raw); }
}

// Device storage is optional and untrusted. Never let it crash a success page.
export function readSessionConfirmation(key: string): string | null {
  const transient = transientConfirmations.get(key);
  if (transient !== undefined) return transient;
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function parseRequestConfirmation(raw: string | null, kind: 'custom' | 'bulk'): RequestConfirmation | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const pattern = kind === 'custom' ? /^CR-[0-9]{4}-[A-Z0-9]{6}$/ : /^BR-[0-9]{4}-[A-Z0-9]{6}$/;
    if (typeof record.publicRequestId !== 'string' || !pattern.test(record.publicRequestId)) return null;
    if (typeof record.submittedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(record.submittedAt) || !Number.isFinite(Date.parse(record.submittedAt))) return null;
    if (kind === 'bulk' && (typeof record.summary !== 'string' || record.summary.length > 300)) return null;
    return { publicRequestId: record.publicRequestId, submittedAt: record.submittedAt, summary: typeof record.summary === 'string' ? record.summary : '' };
  } catch { return null; }
}
