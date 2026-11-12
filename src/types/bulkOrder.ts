import type { DeliveryMethod, PreferredLanguage, CustomOrderFile } from './customOrder';

export const bulkTypes = ['existing_product', 'customized_product', 'custom_requirement'] as const;
export type BulkType = (typeof bulkTypes)[number];
export type RepeatType = 'one_time' | 'repeat' | 'not_sure';
export type RepeatFrequency = '' | 'weekly' | 'monthly' | 'quarterly' | 'as_needed' | 'custom';
export type OrganizationType = 'individual' | 'business' | 'organization' | 'institution' | 'event_group' | 'other';
export type CustomizationMode = 'same' | 'different';

export type BulkLineItem = {
  localId: string;
  productId: string | null;
  productSlug: string | null;
  itemType: 'catalog' | 'custom';
  description: string;
  quantity: number;
  configuration: Record<string, string | boolean>;
  sameCustomizationForAll: boolean | null;
  customizationMode: CustomizationMode;
  customizationNotes: string;
  notes: string;
};

export type BulkOrderFormValues = {
  bulkType: BulkType | '';
  items: BulkLineItem[];
  requirementTitle: string;
  requirementDescription: string;
  intendedUse: string;
  dimensions: string;
  materialPreference: string;
  colorPreference: string;
  repeatType: RepeatType;
  repeatFrequency: RepeatFrequency;
  quantityPerCycle: number | null;
  repeatNotes: string;
  targetDate: string;
  deliveryMethod: DeliveryMethod;
  postalCode: string;
  city: string;
  state: string;
  organizationType: OrganizationType;
  organizationName: string;
  contactPerson: string;
  role: string;
  email: string;
  phone: string;
  preferredLanguage: PreferredLanguage;
  poReference: string;
  hasTargetBudget: boolean;
  targetBudget: number | null;
  targetUnitPrice: number | null;
  verificationRequested: boolean;
  customerNotes: string;
  accuracyConsent: boolean;
  fileConsent: boolean;
  website: string;
};

export type BulkRequestSubmission = BulkOrderFormValues & { fileIds: string[]; catalogMode: 'sample' | 'live' };
export type BulkOrderFile = CustomOrderFile;

