export const requestTypes = [
  '3d_file',
  'drawing_dimensions',
  'image_reference',
  'modify_design',
  'custom_product',
  'replacement_part',
  'other',
] as const;

export type CustomRequestType = (typeof requestTypes)[number];

export const requestStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'QUOTED',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'CONVERTED_TO_ORDER',
] as const;

export type CustomRequestStatus = (typeof requestStatuses)[number];

export type DeliveryMethod = 'shipping' | 'local_pickup' | 'local_delivery';
export type PreferredLanguage = 'english' | 'hindi' | 'assamese';
export type CommunicationMethod = 'email' | 'phone';

export type CustomOrderFormValues = {
  requestType: CustomRequestType | '';
  title: string;
  description: string;
  intendedUse: string;
  functionalPurpose: string;
  usedWhere: string;
  loadConditions: string;
  heatExposure: boolean;
  outdoorUse: boolean;
  waterChemicalExposure: boolean;
  exactDimensions: string;
  originalPartAvailable: boolean;
  safetyNotes: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: 'mm' | 'cm' | 'in';
  material: 'not_sure' | 'pla' | 'petg' | 'tpu' | 'abs' | 'resin';
  colorPreference: 'no_preference' | 'specific';
  colorDetails: string;
  personalizationType: string;
  personalizationText: string;
  quantity: number;
  targetDate: string;
  deliveryMethod: DeliveryMethod;
  pinCode: string;
  city: string;
  state: string;
  verificationRequested: boolean;
  notes: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  communicationMethod: CommunicationMethod;
  language: PreferredLanguage;
  policyConsent: boolean;
  accuracyConsent: boolean;
  website: string;
  sourceProductSlug: string;
};

export type UploadState = 'selected' | 'preparing' | 'uploading' | 'ready' | 'error';

export type CustomOrderFile = {
  localId: string;
  file: File;
  state: UploadState;
  progress: number;
  error?: string;
  serverFileId?: string;
};

export type CustomRequestSubmission = CustomOrderFormValues & {
  fileIds: string[];
};

