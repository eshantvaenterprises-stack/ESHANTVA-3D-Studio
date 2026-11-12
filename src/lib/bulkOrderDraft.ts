import type { BulkOrderFormValues } from '@/types/bulkOrder';

const KEY = 'eshantva-bulk-order-safe-draft-v1';
export type SafeBulkDraft = Pick<BulkOrderFormValues, 'bulkType' | 'items' | 'repeatType' | 'repeatFrequency' | 'deliveryMethod' | 'organizationType' | 'preferredLanguage' | 'verificationRequested'> & { stepId: string; savedAt: string };

export function readSafeBulkDraft(): SafeBulkDraft | null {
  try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as SafeBulkDraft : null; } catch { return null; }
}
export function writeSafeBulkDraft(values: BulkOrderFormValues, stepId: string) {
  const items = values.items.map(({ localId, productId, productSlug, itemType, quantity, configuration, sameCustomizationForAll, customizationMode }) => ({ localId, productId, productSlug, itemType, quantity, configuration, sameCustomizationForAll, customizationMode, description: '', customizationNotes: '', notes: '' }));
  const safe: SafeBulkDraft = { bulkType: values.bulkType, items, repeatType: values.repeatType, repeatFrequency: values.repeatFrequency, deliveryMethod: values.deliveryMethod, organizationType: values.organizationType, preferredLanguage: values.preferredLanguage, verificationRequested: values.verificationRequested, stepId, savedAt: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(safe)); } catch { /* Optional device-only draft. */ }
}
export function clearSafeBulkDraft() { try { localStorage.removeItem(KEY); } catch { /* no-op */ } }

