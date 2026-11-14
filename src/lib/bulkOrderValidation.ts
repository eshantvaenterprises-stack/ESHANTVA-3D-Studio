import { z } from './zodCsp';
import { bulkOrderConfig } from '@/config/bulkOrder';
import { bulkTypes } from '@/types/bulkOrder';

const clean = (max: number) => z.string().trim().max(max);
const configurationValue = z.union([z.string().trim().max(500), z.boolean()]);

export const bulkLineItemSchema = z.object({
  localId: z.string().min(1).max(80), productId: z.string().trim().max(120).nullable(),
  productSlug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120).nullable(),
  itemType: z.enum(['catalog', 'custom']), description: clean(3000), quantity: z.number().int().min(1).max(1_000_000),
  configuration: z.record(z.string().max(120), configurationValue), sameCustomizationForAll: z.boolean().nullable(),
  customizationMode: z.enum(['same', 'different']), customizationNotes: clean(3000), notes: clean(3000),
});

export const bulkOrderSubmissionSchema = z.object({
  bulkType: z.enum(bulkTypes), items: z.array(bulkLineItemSchema).min(1).max(25),
  requirementTitle: clean(120), requirementDescription: clean(3000), intendedUse: clean(1000),
  dimensions: clean(1000), materialPreference: clean(300), colorPreference: clean(300),
  repeatType: z.enum(['one_time', 'repeat', 'not_sure']),
  repeatFrequency: z.enum(['', 'weekly', 'monthly', 'quarterly', 'as_needed', 'custom']),
  quantityPerCycle: z.number().int().min(1).max(1_000_000).nullable(), repeatNotes: clean(1500),
  targetDate: z.string().max(10), deliveryMethod: z.enum(['shipping', 'local_pickup', 'local_delivery']),
  postalCode: z.string().trim().regex(/^$|^[1-9][0-9]{5}$/), city: clean(100), state: clean(100),
  organizationType: z.enum(['individual', 'business', 'organization', 'institution', 'event_group', 'other']),
  organizationName: clean(200), contactPerson: clean(120).min(2), role: clean(120), email: z.email().max(254),
  phone: z.string().trim().regex(/^$|^[+0-9 ()-]{7,20}$/), preferredLanguage: z.enum(['english', 'hindi', 'assamese']),
  poReference: clean(120), hasTargetBudget: z.boolean(), targetBudget: z.number().positive().max(1_000_000_000).nullable(),
  targetUnitPrice: z.number().positive().max(100_000_000).nullable(), verificationRequested: z.boolean(),
  customerNotes: clean(3000), accuracyConsent: z.literal(true), fileConsent: z.boolean(), website: z.literal(''),
  fileIds: z.array(z.uuid()).max(bulkOrderConfig.limits.maxFiles), catalogMode: z.enum(['sample', 'live']),
}).superRefine((value, ctx) => {
  if (value.bulkType !== 'custom_requirement' && value.items.some((item) => !item.productId || !item.productSlug))
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Select a valid Shop product for every line item.' });
  if (value.bulkType === 'custom_requirement' && (value.requirementTitle.length < 3 || value.requirementDescription.length < 20 || value.intendedUse.length < 3))
    ctx.addIssue({ code: 'custom', path: ['requirementDescription'], message: 'Add a title, detailed requirement and intended use.' });
  if (value.bulkType === 'customized_product' && value.items.some((item) => !item.customizationNotes.trim()))
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Describe the customization for every selected product.' });
  if (value.repeatType === 'repeat' && !value.repeatFrequency)
    ctx.addIssue({ code: 'custom', path: ['repeatFrequency'], message: 'Choose the expected repeat frequency.' });
  if (value.deliveryMethod !== 'local_pickup' && (!value.postalCode || !value.city || !value.state))
    ctx.addIssue({ code: 'custom', path: ['deliveryMethod'], message: 'PIN code, city and state are required for this delivery method.' });
  if (value.organizationType !== 'individual' && !value.organizationName)
    ctx.addIssue({ code: 'custom', path: ['organizationName'], message: 'Add the organization or group name.' });
  if (value.hasTargetBudget && value.targetBudget === null)
    ctx.addIssue({ code: 'custom', path: ['targetBudget'], message: 'Add the optional target budget or choose No.' });
  if (value.fileIds.length > 0 && !value.fileConsent)
    ctx.addIssue({ code: 'custom', path: ['fileConsent'], message: 'Confirm that you are authorized to submit the attached files.' });
});

