import type { BulkOrderFormValues, BulkType } from '@/types/bulkOrder';
import { customOrderConfig } from './customOrder';

export const bulkOrderConfig = {
  limits: customOrderConfig.limits,
  acceptedExtensions: [...customOrderConfig.acceptedExtensions, '.csv'],
  acceptedMimeTypes: [...customOrderConfig.acceptedMimeTypes, 'text/csv', 'application/csv'],
  csvMaxBytes: 5 * 1024 * 1024,
  features: {
    bulkOrderEnabled: true,
    multipleProductsEnabled: true,
    personalizationCsvEnabled: true,
    bulkSampleApprovalEnabled: false,
    recurringSupplyEnabled: false,
    gstInvoiceRequestEnabled: false,
    poUploadEnabled: false,
    businessAccountsEnabled: false,
    savedBulkListsEnabled: false,
    verificationServiceEnabled: true,
  },
} as const;

export const bulkStatusLabels = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  MORE_INFORMATION_REQUIRED: 'More Information Required',
  QUOTATION_PREPARATION: 'Quotation Being Prepared',
  QUOTATION_SENT: 'Quotation Sent',
  AWAITING_CUSTOMER_APPROVAL: 'Awaiting Your Approval',
  ACCEPTED: 'Accepted',
  REJECTED: 'Unable to Proceed',
  CANCELLED: 'Cancelled',
  CONVERTED_TO_ORDER: 'Converted to Order',
} as const;

export const bulkTypeOptions: Array<{ value: BulkType; title: string; description: string }> = [
  { value: 'existing_product', title: 'Order an Existing Product in Bulk', description: 'Select one or more products already listed in the Shop.' },
  { value: 'customized_product', title: 'Customize an Existing Product in Bulk', description: 'Start with a Shop product, then add approved text, logo, colour or other personalization.' },
  { value: 'custom_requirement', title: 'Submit a Custom Bulk Requirement', description: 'Describe an item that is not currently in the Shop and attach specifications or references.' },
];

export const bulkOrderDefaults: BulkOrderFormValues = {
  bulkType: '', items: [], requirementTitle: '', requirementDescription: '', intendedUse: '',
  dimensions: '', materialPreference: '', colorPreference: '', repeatType: 'one_time',
  repeatFrequency: '', quantityPerCycle: null, repeatNotes: '', targetDate: '',
  deliveryMethod: 'shipping', postalCode: '', city: '', state: '', organizationType: 'individual',
  organizationName: '', contactPerson: '', role: '', email: '', phone: '', preferredLanguage: 'english',
  poReference: '', hasTargetBudget: false, targetBudget: null, targetUnitPrice: null,
  verificationRequested: false, customerNotes: '', accuracyConsent: false, fileConsent: false, website: '',
};
