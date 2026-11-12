import type { CustomOrderFormValues, CustomRequestStatus, CustomRequestType } from '@/types/customOrder';

export const customOrderConfig = {
  limits: {
    maxFiles: 5,
    maxFileBytes: 50 * 1024 * 1024,
    maxTotalBytes: 150 * 1024 * 1024,
    maxNotesLength: 3000,
    bulkQuantityThreshold: 25,
  },
  acceptedExtensions: ['.stl', '.3mf', '.obj', '.step', '.stp', '.glb', '.gltf', '.pdf', '.jpg', '.jpeg', '.png'],
  acceptedMimeTypes: [
    'model/stl', 'application/sla', 'application/vnd.ms-pki.stl',
    'model/3mf', 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    'model/obj', 'text/plain', 'application/step', 'model/step',
    'model/gltf-binary', 'model/gltf+json', 'application/json',
    'application/pdf', 'image/jpeg', 'image/png', 'application/octet-stream',
  ],
  features: {
    customOrderEnabled: true,
    customerAccountsEnabled: false,
    fileUploadEnabled: true,
    threeDPreviewEnabled: false,
    verificationServiceEnabled: true,
    localPickupEnabled: true,
    localDeliveryEnabled: true,
    panIndiaShippingEnabled: true,
    whatsappEnabled: false,
  },
} as const;

export const requestTypeOptions: Array<{
  value: CustomRequestType;
  label: string;
  description: string;
  fileExpected?: boolean;
}> = [
  { value: '3d_file', label: 'I have a 3D file', description: 'STL, 3MF, OBJ, STEP, GLB or glTF.', fileExpected: true },
  { value: 'drawing_dimensions', label: 'I have a drawing or dimensions', description: 'Share a PDF, sketch or exact measurements.', fileExpected: true },
  { value: 'image_reference', label: 'I have an image or reference', description: 'Show the shape, style or result you have in mind.', fileExpected: true },
  { value: 'modify_design', label: 'Modify an existing design', description: 'Explain what should change in an existing design.' },
  { value: 'custom_product', label: 'Create a custom product', description: 'Start with a product idea and intended use.' },
  { value: 'replacement_part', label: 'Replacement or functional part', description: 'Describe fit, function and operating conditions.' },
  { value: 'other', label: 'Something else', description: 'Send a requirement that does not fit the options above.' },
];

export const statusLabels: Record<CustomRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  NEEDS_INFORMATION: 'More information needed',
  QUOTED: 'Quotation shared',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  CONVERTED_TO_ORDER: 'Converted to order',
};

export const customOrderDefaults: CustomOrderFormValues = {
  requestType: '', title: '', description: '', intendedUse: '',
  functionalPurpose: '', usedWhere: '', loadConditions: '', heatExposure: false,
  outdoorUse: false, waterChemicalExposure: false, exactDimensions: '',
  originalPartAvailable: false, safetyNotes: '', length: null, width: null, height: null,
  dimensionUnit: 'mm', material: 'not_sure', colorPreference: 'no_preference',
  colorDetails: '', personalizationType: '', personalizationText: '', quantity: 1,
  targetDate: '', deliveryMethod: 'shipping', pinCode: '', city: '', state: '',
  verificationRequested: false, notes: '', customerName: '', customerEmail: '',
  customerPhone: '', communicationMethod: 'email', language: 'english',
  policyConsent: false, accuracyConsent: false, website: '', sourceProductSlug: '',
};

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

