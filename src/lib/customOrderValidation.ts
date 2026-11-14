import { z } from './zodCsp';
import { customOrderConfig } from '@/config/customOrder';
import { requestTypes } from '@/types/customOrder';

const cleanText = (maximum: number) => z.string().trim().max(maximum);
const optionalMeasurement = z.number().positive().max(1_000_000).nullable();

export const customOrderSubmissionSchema = z.object({
  requestType: z.enum(requestTypes),
  title: cleanText(120).min(3),
  description: cleanText(3000).min(20),
  intendedUse: cleanText(1000).min(3),
  functionalPurpose: cleanText(1000),
  usedWhere: cleanText(1000),
  loadConditions: cleanText(1000),
  heatExposure: z.boolean(), outdoorUse: z.boolean(), waterChemicalExposure: z.boolean(),
  exactDimensions: cleanText(1000), originalPartAvailable: z.boolean(), safetyNotes: cleanText(1500),
  length: optionalMeasurement, width: optionalMeasurement, height: optionalMeasurement,
  dimensionUnit: z.enum(['mm', 'cm', 'in']),
  material: z.enum(['not_sure', 'pla', 'petg', 'tpu', 'abs', 'resin']),
  colorPreference: z.enum(['no_preference', 'specific']), colorDetails: cleanText(200),
  personalizationType: cleanText(120), personalizationText: cleanText(500),
  quantity: z.number().int().min(1).max(100_000),
  targetDate: z.string().max(10), deliveryMethod: z.enum(['shipping', 'local_pickup', 'local_delivery']),
  pinCode: z.string().trim().regex(/^$|^[1-9][0-9]{5}$/), city: cleanText(100), state: cleanText(100),
  verificationRequested: z.boolean(), notes: cleanText(customOrderConfig.limits.maxNotesLength),
  customerName: cleanText(120).min(2), customerEmail: z.email().max(254),
  customerPhone: z.string().trim().regex(/^$|^[+0-9 ()-]{7,20}$/),
  communicationMethod: z.enum(['email', 'phone']), language: z.enum(['english', 'hindi', 'assamese']),
  policyConsent: z.literal(true), accuracyConsent: z.literal(true), website: z.literal(''),
  sourceProductSlug: z.string().trim().max(120).regex(/^$|^[a-z0-9-]+$/),
  fileIds: z.array(z.uuid()).max(customOrderConfig.limits.maxFiles),
}).superRefine((value, context) => {
  if (value.requestType === 'replacement_part') {
    if (!value.functionalPurpose) context.addIssue({ code: 'custom', path: ['functionalPurpose'], message: 'Describe what the part must do.' });
    if (!value.usedWhere) context.addIssue({ code: 'custom', path: ['usedWhere'], message: 'Describe where the part is used.' });
    if (!value.exactDimensions) context.addIssue({ code: 'custom', path: ['exactDimensions'], message: 'Provide the known dimensions or explain what is unknown.' });
  }
  if (value.colorPreference === 'specific' && !value.colorDetails) context.addIssue({ code: 'custom', path: ['colorDetails'], message: 'Describe the preferred colour.' });
  if (value.deliveryMethod !== 'local_pickup' && (!value.pinCode || !value.city || !value.state)) {
    for (const field of ['pinCode', 'city', 'state'] as const) if (!value[field]) context.addIssue({ code: 'custom', path: [field], message: 'Required for this delivery method.' });
  }
  if (value.communicationMethod === 'phone' && !value.customerPhone) context.addIssue({ code: 'custom', path: ['customerPhone'], message: 'Add a phone number or choose email.' });
});

export function toMillimetres(value: number | null, unit: 'mm' | 'cm' | 'in') {
  if (value === null) return null;
  if (unit === 'cm') return value * 10;
  if (unit === 'in') return value * 25.4;
  return value;
}

