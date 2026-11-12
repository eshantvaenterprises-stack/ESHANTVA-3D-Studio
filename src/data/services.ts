import type { CapabilityStatus, ServiceCapability } from '@/types/service';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';

export const capabilityStatusLabels: Record<CapabilityStatus, string> = {
  available: 'Available',
  selected_requests: 'Selected Requests',
  review_required: 'Review Required',
  case_by_case: 'Case-by-Case',
};

export const capabilityStatusDescriptions: Record<CapabilityStatus, string> = {
  available: 'Suitable requests can normally proceed through the applicable product or service flow.',
  selected_requests: 'The category is supported for specific types of requirements.',
  review_required: 'The requirement must be evaluated before acceptance, pricing or production is confirmed.',
  case_by_case: 'Availability depends on factors such as complexity, quantity and specification.',
};

export const serviceCapabilities: ServiceCapability[] = [
  {
    id: 'custom-printing', feature: 'customPrinting', anchor: 'custom-3d-printing', index: '01',
    title: 'Custom 3D Printing', headline: 'Bring the file. Define the result.', icon: 'box', status: 'available',
    shortDescription: 'Submit compatible digital files or clear production information for a custom printing request.',
    description: 'Customers can submit compatible digital files and production requirements. Geometry, material, purpose and quantity may still need review before acceptance.',
    suitableRequests: ['Custom organizers', 'Personalized objects', 'Holders', 'Display models', 'Simple enclosures', 'Selected functional pieces', 'Custom-purpose products'],
    helpfulInputs: ['STL, 3MF, OBJ, STEP/STP, GLB or glTF', 'Drawing or dimensions', 'Reference images', 'Quantity and intended use'],
    notes: ['File submission starts a request; it does not automatically confirm production.'],
    primaryCta: { label: 'Start Custom Order', href: '/custom-order', event: 'service_custom_order_click' },
    tags: ['3d file', 'custom printing', 'model', 'drawing', 'dimensions'], featured: true,
  },
  {
    id: 'personalisation', feature: 'personalisation', anchor: 'personalisation', index: '02',
    title: 'Product Personalisation', headline: 'Make an existing product more personal.', icon: 'sparkles', status: 'selected_requests',
    shortDescription: 'Choose supported personalisation options on compatible catalog products.',
    description: 'Selected products may support a name, text, colour, logo, reference, size or quantity option. Only the options configured on the relevant product are offered directly.',
    suitableRequests: ['Name or short text', 'Configured colours', 'Logo or image reference', 'Size where applicable', 'Single or larger quantity'],
    notes: ['Personalisation should be finalized before production. Changes after production begins may involve additional cost, and changes after manufacturing may require reprinting.'],
    primaryCta: { label: 'Browse Customisable Products', href: '/shop?customisable=true', event: 'service_shop_click' },
    tags: ['personalisation', 'name', 'text', 'logo', 'colour', 'catalog'], featured: true,
  },
  {
    id: 'design-support', feature: 'designSupport', anchor: 'design-support', index: '03',
    title: 'Design Support', headline: 'Shape supplied information into a clearer request.', icon: 'pencil', status: 'selected_requests',
    shortDescription: 'Selected modifications and straightforward dimensional design requests can be reviewed.',
    description: 'Support may include text or name modification, resizing, simple geometry, basic dimensional models, selected model adjustments or preparation of supplied design information.',
    suitableRequests: ['Text or name modification', 'Resizing', 'Simple geometry', 'Basic dimensional models', 'Selected model adjustments', 'Supplied design preparation'],
    notes: ['Complexity varies widely, so more advanced requests are reviewed before acceptance.'],
    primaryCta: { label: 'Submit Design Requirement', href: '/custom-order', event: 'service_custom_order_click' },
    tags: ['design support', 'resize', 'modification', 'simple geometry', 'dimensions'],
  },
  {
    id: 'prototyping', feature: 'prototyping', anchor: 'prototyping', index: '04',
    title: 'Prototype Requests', headline: 'Turn a concept into something you can hold.', icon: 'prototype', status: 'review_required',
    shortDescription: 'Submit a concept, model, drawing, dimensions or reference for a physical prototype request.',
    description: 'Prototype-related requests are considered from the information supplied and the intended purpose. Additional details may be needed before a quotation or production decision.',
    helpfulInputs: ['Concept or intended use', 'Existing model or drawing', 'Dimensions', 'Reference images', 'What you need to evaluate'],
    notes: ['A prototype request is not represented as engineering validation or certification.'],
    primaryCta: { label: 'Submit a Prototype Request', href: '/custom-order', event: 'service_custom_order_click' },
    tags: ['prototype', 'concept', 'physical model', 'review'],
  },
  {
    id: 'functional-parts', feature: 'functionalParts', anchor: 'functional-parts', index: '05',
    title: 'Functional & Replacement Requests', headline: 'Need a part with a specific purpose?', icon: 'wrench', status: 'review_required',
    shortDescription: 'Selected functional and replacement-part requirements can be submitted for individual review.',
    description: 'Provide an existing digital model, drawing, dimensions, photographs or reference information together with the intended use. Acceptance depends on the requirement and supplied information.',
    helpfulInputs: ['What the part does', 'Dimensions', 'Reference photos', 'Existing drawing or file', 'Environment of use', 'Heat, water or load exposure where relevant'],
    notes: ['Functional and replacement-part requests are reviewed individually based on the information supplied and intended use.'],
    primaryCta: { label: 'Submit Part Requirement', href: '/custom-order', event: 'service_custom_order_click' },
    tags: ['functional part', 'replacement part', 'fit', 'purpose', 'conditions'],
  },
  {
    id: 'small-batch', feature: 'smallBatch', anchor: 'small-batch', index: '06',
    title: 'Small-Batch Production', headline: 'Need more than one?', icon: 'batch', status: 'case_by_case',
    shortDescription: 'Request multiple units of a catalog, personalized or accepted custom product.',
    description: 'ESHANTVA may accept multiple-unit production depending on quantity, specifications, customization and production feasibility.',
    suitableRequests: ['Standard catalog products', 'Personalized catalog products', 'Accepted custom products'],
    notes: ['Quantity requirements are reviewed according to the product or request. No universal minimum quantity or automatic discount is stated.'],
    primaryCta: { label: 'Start a Bulk Enquiry', href: '/bulk-order', event: 'service_bulk_order_click' },
    tags: ['bulk order', 'small batch', 'catalog quantity', 'personalized quantity', 'custom quantity'], featured: true,
  },
];

export const enabledServiceCapabilities = serviceCapabilities.filter((service) =>
  siteConfig.features.services[service.feature] && (retailVisibility.isInternal || service.id !== 'personalisation'),
);
