import { businessIdentity } from '@/config/businessIdentity';
import { customOrderConfig } from '@/config/customOrder';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';
import type { FaqCategory, FaqCategoryDefinition, FaqItem } from '@/types/faq';

const acceptedFileTypes = customOrderConfig.acceptedExtensions
  .map((extension) => extension.replace(/^\./, '').toUpperCase())
  .join(', ');

export const faqCategories: FaqCategoryDefinition[] = [
  { id: 'shop-products', label: 'Shop & Products', shortLabel: 'Shop', description: 'Buying, personalisation and larger-quantity routes for catalog products.' },
  { id: 'custom-orders', label: 'Custom Orders', shortLabel: 'Custom', description: 'Starting information, files, review and selected functional requests.' },
  { id: 'bulk-orders', label: 'Bulk Orders', shortLabel: 'Bulk', description: 'Larger quantities, personalisation, minimums and pricing expectations.' },
  { id: 'materials-options', label: 'Materials & Options', shortLabel: 'Materials', description: 'Customer-facing material, colour and availability guidance.' },
  { id: 'pricing-payment', label: 'Pricing & Payment', shortLabel: 'Payment', description: 'How pricing is confirmed and when payment is required.' },
  { id: 'delivery-pickup', label: 'Delivery & Pickup', shortLabel: 'Delivery', description: 'Pan-India shipping, local pickup, local delivery and visits.' },
  { id: 'process-changes', label: 'Process & Changes', shortLabel: 'Process', description: 'Production start, changes, verification and preview expectations.' },
  { id: 'business-support', label: 'Business & Support', shortLabel: 'Business', description: 'Verified business identity, location and available support routes.' },
];

export const faqs: FaqItem[] = [
  {
    id: 'shop-direct-purchase',
    category: 'shop-products',
    question: 'Can I buy products directly from the Shop?',
    answer: siteConfig.features.onlinePayments
      ? 'Products configured for direct purchase can follow the available product, cart and checkout flow. Product-specific availability and options still apply.'
      : 'Products configured for direct purchase can be selected and added to the cart where available. Online payment is not currently enabled, so final confirmation and payment follow the applicable order route.',
    keywords: ['shop', 'buy', 'cart', 'checkout', 'online payment', 'product'],
    featured: true,
  },
  {
    id: 'shop-personalisation',
    category: 'shop-products',
    question: 'Can I personalise every product?',
    answer: 'No. Personalisation is available only when the specific product is configured with supported options. Additional or unlisted changes should be submitted for review through Custom Order.',
    keywords: ['personalise', 'personalize', 'customise', 'customize', 'text', 'name', 'logo'],
  },
  {
    id: 'shop-bulk',
    category: 'shop-products',
    question: 'Can a normal Shop product be ordered in a larger quantity?',
    answer: 'Yes. Larger-quantity requirements for existing Shop products can be submitted through Bulk Order. Quantity, personalisation and commercial terms are reviewed according to the actual requirement.',
    keywords: ['bulk', 'quantity', 'many', 'batch', 'shop product'],
  },
  {
    id: 'custom-starting-information',
    category: 'custom-orders',
    question: 'What can I submit for a custom request?',
    answer: `You can start with a 3D file, drawing, dimensions, image/reference, an existing design or a written requirement. Currently accepted upload extensions are ${acceptedFileTypes}; having a 3D file is not required for every request.`,
    keywords: ['3d file', 'drawing', 'dimensions', 'image', 'reference', 'idea', 'upload', 'stl', '3mf', 'step', 'pdf'],
    featured: true,
  },
  {
    id: 'custom-submission-confirmation',
    category: 'custom-orders',
    question: 'Does submitting a custom request confirm my order?',
    answer: 'No. Submission starts a review. Acceptance, quotation or specification confirmation, applicable payment and production happen only after the request is reviewed and the relevant order conditions are completed.',
    keywords: ['submit', 'confirmed', 'accepted', 'quotation', 'production'],
  },
  {
    id: 'custom-modify-functional',
    category: 'custom-orders',
    question: 'Can I request a modification, replacement part or functional part?',
    answer: 'Selected modifications, replacement parts and functional requirements can be submitted for individual review. Feasibility depends on the information supplied, complexity, intended use and whether the requirement can be accepted safely and practically.',
    keywords: ['modify', 'replacement', 'functional', 'part', 'repair', 'existing model'],
  },
  {
    id: 'bulk-existing-personalised',
    category: 'bulk-orders',
    question: 'Can I bulk-order an existing Shop product with personalisation?',
    answer: 'Yes. Bulk Order can start from an existing catalog product, a personalised catalog product or a custom requirement. Different personalisation details may be submitted where the product and requirement support them.',
    keywords: ['bulk', 'existing product', 'catalog', 'personalisation', 'personalization'],
    featured: true,
  },
  {
    id: 'bulk-moq',
    category: 'bulk-orders',
    question: 'Is there a fixed minimum quantity for bulk orders?',
    answer: 'No public fixed minimum quantity has been established. The suitable quantity and order route are reviewed according to the product or requirement.',
    keywords: ['moq', 'minimum order quantity', 'minimum', 'bulk quantity'],
  },
  {
    id: 'bulk-discount',
    category: 'bulk-orders',
    question: 'Do bulk orders automatically receive a discount?',
    answer: 'No fixed discount is guaranteed. Bulk pricing is reviewed using the actual product, quantity, customisation and production requirements rather than a universal public discount rule.',
    keywords: ['discount', 'bulk price', 'volume', 'offer'],
  },
  {
    id: 'materials-all-products',
    category: 'materials-options',
    question: 'Do all products support every material?',
    answer: 'No. Material options depend on the specific product, geometry, intended use and accepted requirement. Product-specific options take priority over the general materials guide.',
    keywords: ['material', 'all products', 'pla', 'abs', 'tpu'],
  },
  {
    id: 'materials-colour',
    category: 'materials-options',
    question: 'Can I choose a colour?',
    answer: 'Selected products or material options may support colour choices according to the availability shown for that product or requirement. Final colour availability is confirmed before the order proceeds.',
    keywords: ['colour', 'color', 'shade', 'filament'],
  },
  {
    id: 'materials-on-request',
    category: 'materials-options',
    question: 'What does “On Request” mean?',
    answer: 'It means the option requires confirmation before production can be accepted. A request can be submitted, but availability or suitability is not guaranteed until reviewed.',
    keywords: ['on request', 'availability', 'confirm', 'material status'],
  },
  {
    id: 'materials-unlisted',
    category: 'materials-options',
    question: 'Can I request a material that is not listed?',
    answer: 'You can submit the requirement for review, but availability is not guaranteed. If you are unsure which material fits the intended use, start with the Materials & Options guide or describe the use through Custom Order.',
    keywords: ['unlisted material', 'different material', 'not listed', 'which material'],
  },
  {
    id: 'pricing-custom',
    category: 'pricing-payment',
    question: 'How is a custom order priced?',
    answer: 'Custom pricing is confirmed after the requirement is reviewed. A submitted request is not itself a confirmed quotation; pricing follows the accepted specification, options and quantity.',
    keywords: ['custom price', 'quote', 'quotation', 'cost'],
  },
  {
    id: 'pricing-bulk',
    category: 'pricing-payment',
    question: 'How is bulk pricing determined?',
    answer: 'Bulk pricing is reviewed according to the product, quantity, customisation and production requirements. No fixed public discount or pricing formula is promised.',
    keywords: ['bulk price', 'quotation', 'quantity', 'commercial terms'],
  },
  {
    id: 'payment-terms',
    category: 'pricing-payment',
    question: 'When is full payment required, and can high-value orders use advance terms?',
    answer: 'Standard and lower-value accepted orders require full payment, including lower-value bulk orders. Qualifying high-value orders may receive individually agreed partial or advance-payment terms, with no publicly fixed percentage.',
    keywords: ['payment', 'full payment', 'partial payment', 'advance', 'high value'],
    featured: true,
  },
  {
    id: 'payment-cod',
    category: 'pricing-payment',
    question: 'Is COD available?',
    answer: 'No. Cash on delivery is not available.',
    keywords: ['cod', 'cash on delivery', 'payment'],
  },
  {
    id: 'delivery-pan-india',
    category: 'delivery-pickup',
    question: 'Do you ship across India, and who pays shipping charges?',
    answer: siteConfig.panIndiaDelivery
      ? 'Yes. Pan-India shipping is enabled, and the customer pays applicable shipping charges. No fixed courier or delivery timeline is promised here.'
      : 'Pan-India shipping is not currently enabled in the public service configuration.',
    keywords: ['shipping', 'pan india', 'delivery', 'charges', 'courier'],
    featured: true,
  },
  {
    id: 'delivery-pickup',
    category: 'delivery-pickup',
    question: 'Is local pickup available?',
    answer: siteConfig.localPickup
      ? 'Yes. Local pickup is available according to the current arrangement, and there is no pickup charge.'
      : 'Local pickup is not currently enabled in the public service configuration.',
    keywords: ['pickup', 'collect', 'local'],
  },
  {
    id: 'delivery-local',
    category: 'delivery-pickup',
    question: 'Is local delivery available?',
    answer: customOrderConfig.features.localDeliveryEnabled
      ? 'Local delivery may be available depending on the location. A location-based additional charge may apply and is confirmed for the order.'
      : 'Local delivery is not currently enabled.',
    keywords: ['local delivery', 'nearby', 'charge', 'location'],
  },
  {
    id: 'delivery-visit',
    category: 'delivery-pickup',
    question: 'Can I visit the studio?',
    answer: 'Yes, by prior appointment. Public opening hours are not claimed, and any visit should be arranged before arrival.',
    keywords: ['visit', 'studio', 'appointment', 'biswanath'],
  },
  {
    id: 'process-production-start',
    category: 'process-changes',
    question: 'When does production begin?',
    answer: 'Production begins only after the applicable requirement review, customer confirmation or approval, and payment conditions have been completed. The next production step is confirmed for the accepted order.',
    keywords: ['production', 'start', 'approval', 'payment'],
  },
  {
    id: 'process-changes-cancellation',
    category: 'process-changes',
    question: 'Can I change or cancel an order after submission?',
    answer: 'Changes before production begins may be possible. Later changes can create additional cost, and completed or personalised work may require reprinting or have limited cancellation eligibility; the applicable Cancellation & Refund Policy should be checked for the accepted order.',
    keywords: ['change', 'cancel', 'refund', 'reprint', 'after submission'],
  },
  {
    id: 'process-verification',
    category: 'process-changes',
    question: 'Can I see the finished product before dispatch?',
    answer: customOrderConfig.features.verificationServiceEnabled
      ? 'Eligible orders may request finished-product photo or video verification before dispatch. Availability and any additional order-specific charge are confirmed during review.'
      : 'Finished-product photo or video verification is not currently enabled.',
    keywords: ['photo', 'video', 'verification', 'before dispatch', 'finished product'],
  },
  {
    id: 'process-preview',
    category: 'process-changes',
    question: 'Is a digital 3D preview an exact guarantee of the final product?',
    answer: 'No. A digital 3D preview, when available, is a visual reference only. Final production follows the accepted specification and source information, so appearance, displayed scale, colour or surface details may differ from the preview.',
    keywords: ['3d preview', 'exact', 'guarantee', 'visual reference'],
  },
  {
    id: 'business-gst',
    category: 'business-support',
    question: 'Is ESHANTVA 3D Studio GST registered?',
    answer: `Yes. ${businessIdentity.tradeName} is GST registered. GSTIN: ${businessIdentity.gstin}.`,
    keywords: ['gst', 'gstin', 'registered', 'tax'],
    featured: true,
  },
  {
    id: 'business-location',
    category: 'business-support',
    question: 'Where is ESHANTVA located?',
    answer: `${businessIdentity.tradeName} operates from ${businessIdentity.publicLocation}. Studio visits are arranged by prior appointment.`,
    keywords: ['location', 'biswanath', 'assam', 'india', 'studio'],
  },
  {
    id: 'business-contact',
    category: 'business-support',
    question: 'How can I contact ESHANTVA if public phone or WhatsApp details are not shown?',
    answer: siteConfig.email || siteConfig.whatsapp
      ? 'Use the public contact channel currently enabled on the website, or start through the Shop, Custom Order or Bulk Order route that matches your requirement.'
      : 'Public phone, WhatsApp and email details are not currently published in the site configuration. Use the Shop, Custom Order or Bulk Order route that matches your requirement until a public contact channel is enabled.',
    keywords: ['contact', 'phone', 'whatsapp', 'email', 'support', 'business'],
  },
];

export const enabledFaqs = faqs.filter((faq) => faq.enabled !== false && (retailVisibility.isInternal || faq.category !== 'shop-products'));

export function getFaqsByCategory(category: FaqCategory) {
  return enabledFaqs.filter((faq) => faq.category === category);
}

export function getFaqsByIds(ids: readonly string[]) {
  const byId = new Map(enabledFaqs.map((faq) => [faq.id, faq]));
  return ids.map((id) => byId.get(id)).filter((faq): faq is FaqItem => Boolean(faq));
}

export const homeFaqIds = [
  'custom-starting-information',
  'custom-submission-confirmation',
  'delivery-pan-india',
  'delivery-visit',
  'bulk-moq',
] as const;

export const servicesFaqIds = [
  'custom-starting-information',
  'custom-modify-functional',
  'bulk-existing-personalised',
  'custom-submission-confirmation',
  'delivery-visit',
] as const;

export const materialsFaqIds = [
  'materials-all-products',
  'materials-colour',
  'materials-on-request',
  'materials-unlisted',
] as const;

export const bulkFaqIds = [
  'bulk-existing-personalised',
  'bulk-moq',
  'bulk-discount',
  'payment-terms',
  'delivery-pan-india',
] as const;

export const howItWorksFaqIds = [
  'custom-starting-information',
  'custom-submission-confirmation',
  'payment-terms',
  'payment-cod',
  'process-changes-cancellation',
  'delivery-pickup',
  'delivery-pan-india',
] as const;
