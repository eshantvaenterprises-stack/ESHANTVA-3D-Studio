import assert from 'node:assert/strict';
import { customOrderConfig, requestTypeOptions, statusLabels } from '../src/config/customOrder';
import { customOrderSubmissionSchema, toMillimetres } from '../src/lib/customOrderValidation';

assert.equal(requestTypeOptions.length, 7, 'Custom Order must keep seven configured starting paths.');
assert.deepEqual(customOrderConfig.acceptedExtensions, ['.stl','.3mf','.obj','.step','.stp','.glb','.gltf','.pdf','.jpg','.jpeg','.png']);
assert.equal(customOrderConfig.limits.maxFiles, 5);
assert.equal(customOrderConfig.limits.maxFileBytes, 50 * 1024 * 1024);
assert.equal(customOrderConfig.limits.maxTotalBytes, 150 * 1024 * 1024);
assert.equal(statusLabels.SUBMITTED, 'Submitted');
assert.equal(toMillimetres(2.54, 'cm'), 25.4);
assert.equal(toMillimetres(1, 'in'), 25.4);

const valid = {
  requestType: 'custom_product' as const, title: 'Custom desk organiser',
  description: 'A compact organiser for pens and small workshop tools.', intendedUse: 'Desk organisation',
  functionalPurpose: '', usedWhere: '', loadConditions: '', heatExposure: false, outdoorUse: false,
  waterChemicalExposure: false, exactDimensions: '', originalPartAvailable: false, safetyNotes: '',
  length: 12, width: 8, height: 5, dimensionUnit: 'cm' as const, material: 'not_sure' as const,
  colorPreference: 'no_preference' as const, colorDetails: '', personalizationType: '', personalizationText: '',
  quantity: 1, targetDate: '', deliveryMethod: 'local_pickup' as const, pinCode: '', city: '', state: '',
  verificationRequested: false, notes: '', customerName: 'Test Customer', customerEmail: 'customer@example.com',
  customerPhone: '', communicationMethod: 'email' as const, language: 'english' as const,
  policyConsent: true as const, accuracyConsent: true as const, website: '' as const, sourceProductSlug: '', fileIds: [],
};

assert.equal(customOrderSubmissionSchema.safeParse(valid).success, true, 'A complete custom-product request should validate.');
assert.equal(customOrderSubmissionSchema.safeParse({ ...valid, quantity: 0 }).success, false, 'Quantity zero must fail.');
assert.equal(customOrderSubmissionSchema.safeParse({ ...valid, deliveryMethod: 'shipping', pinCode: '', city: '', state: '' }).success, false, 'Shipping requires location.');
assert.equal(customOrderSubmissionSchema.safeParse({ ...valid, website: 'bot-filled' }).success, false, 'Honeypot must fail.');
assert.equal(customOrderSubmissionSchema.safeParse({ ...valid, requestType: 'replacement_part', functionalPurpose: '', usedWhere: '', exactDimensions: '' }).success, false, 'Functional requests require operating detail.');

console.log('Custom Order configuration and validation tests passed.');

