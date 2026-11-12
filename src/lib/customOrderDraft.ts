import type { CustomOrderFormValues } from '@/types/customOrder';

const DRAFT_KEY = 'eshantva-custom-order-safe-draft-v1';

export type SafeCustomOrderDraft = Pick<CustomOrderFormValues,
  'requestType' | 'quantity' | 'deliveryMethod' | 'dimensionUnit' | 'material' |
  'colorPreference' | 'verificationRequested' | 'language' | 'sourceProductSlug'
> & { step: number; savedAt: string };

export function readSafeDraft(): SafeCustomOrderDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SafeCustomOrderDraft;
    return parsed?.savedAt ? parsed : null;
  } catch { return null; }
}

export function writeSafeDraft(values: CustomOrderFormValues, step: number) {
  const safe: SafeCustomOrderDraft = {
    requestType: values.requestType, quantity: values.quantity, deliveryMethod: values.deliveryMethod,
    dimensionUnit: values.dimensionUnit, material: values.material, colorPreference: values.colorPreference,
    verificationRequested: values.verificationRequested, language: values.language,
    sourceProductSlug: values.sourceProductSlug, step, savedAt: new Date().toISOString(),
  };
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(safe)); }
  catch { /* Draft persistence is optional; never block the form. */ }
}

export function clearSafeDraft() {
  try { localStorage.removeItem(DRAFT_KEY); }
  catch { /* Nothing to clear when storage is unavailable. */ }
}
