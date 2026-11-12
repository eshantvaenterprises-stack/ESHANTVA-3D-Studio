import assert from 'node:assert/strict';
import { bulkOrderConfig, bulkStatusLabels, bulkTypeOptions } from '../src/config/bulkOrder';
import { bulkOrderSubmissionSchema } from '../src/lib/bulkOrderValidation';

assert.equal(bulkTypeOptions.length, 3, 'Bulk Order must keep the three authoritative enquiry paths.');
assert.equal(bulkOrderConfig.limits.maxFiles, 5);
assert.equal(bulkOrderConfig.limits.maxFileBytes, 50 * 1024 * 1024);
assert.equal(bulkOrderConfig.limits.maxTotalBytes, 150 * 1024 * 1024);
assert.equal(bulkOrderConfig.csvMaxBytes, 5 * 1024 * 1024);
assert.equal(bulkStatusLabels.MORE_INFORMATION_REQUIRED, 'More Information Required');
assert.equal(bulkStatusLabels.QUOTATION_PREPARATION, 'Quotation Being Prepared');

const catalogItem = {
  localId: 'line-1',
  productId: 'SAMPLE-002',
  productSlug: 'sample-cable-organiser',
  itemType: 'catalog' as const,
  description: '',
  quantity: 25,
  configuration: {},
  sameCustomizationForAll: null,
  customizationMode: 'same' as const,
  customizationNotes: '',
  notes: '',
};

const valid = {
  bulkType: 'existing_product' as const,
  items: [catalogItem],
  requirementTitle: '',
  requirementDescription: '',
  intendedUse: '',
  dimensions: '',
  materialPreference: '',
  colorPreference: '',
  repeatType: 'one_time' as const,
  repeatFrequency: '' as const,
  quantityPerCycle: null,
  repeatNotes: '',
  targetDate: '',
  deliveryMethod: 'local_pickup' as const,
  postalCode: '',
  city: '',
  state: '',
  organizationType: 'individual' as const,
  organizationName: '',
  contactPerson: 'Test Customer',
  role: '',
  email: 'customer@example.com',
  phone: '',
  preferredLanguage: 'english' as const,
  poReference: '',
  hasTargetBudget: false,
  targetBudget: null,
  targetUnitPrice: null,
  verificationRequested: false,
  customerNotes: '',
  accuracyConsent: true as const,
  fileConsent: false,
  website: '' as const,
  fileIds: [],
  catalogMode: 'sample' as const,
};

assert.equal(bulkOrderSubmissionSchema.safeParse(valid).success, true, 'A complete existing-product bulk enquiry should validate.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, items: [{ ...catalogItem, quantity: 0 }] }).success, false, 'Quantity zero must fail.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, repeatType: 'repeat', repeatFrequency: '' }).success, false, 'Repeat requirements need a frequency.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, deliveryMethod: 'shipping', postalCode: '', city: '', state: '' }).success, false, 'Shipping requires a destination.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, organizationType: 'business', organizationName: '' }).success, false, 'Business enquiries need an organization name.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, hasTargetBudget: true, targetBudget: null }).success, false, 'Selected budget input cannot remain empty.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, fileIds: ['dc4681f6-49e1-4452-8000-f705fe376c43'], fileConsent: false }).success, false, 'Attached files require authorization consent.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, website: 'bot-filled' }).success, false, 'The honeypot must fail.');
assert.equal(bulkOrderSubmissionSchema.safeParse({ ...valid, bulkType: 'customized_product', items: [{ ...catalogItem, customizationNotes: '' }] }).success, false, 'Customized items need customization details.');

const customRequirement = {
  ...valid,
  bulkType: 'custom_requirement' as const,
  requirementTitle: 'Event table identifiers',
  requirementDescription: 'A coordinated set of branded table identifiers for an indoor event.',
  intendedUse: 'Guest table identification',
  items: [{ ...catalogItem, productId: null, productSlug: null, itemType: 'custom' as const, description: 'A coordinated set of branded table identifiers for an indoor event.' }],
};
assert.equal(bulkOrderSubmissionSchema.safeParse(customRequirement).success, true, 'A complete custom bulk requirement should validate.');

console.log('Bulk Order configuration and validation tests passed.');
