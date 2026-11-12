export type LegalPolicyStatus = 'review_required' | 'published';
export type LegalPolicySection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type LegalPolicy = {
  slug: string;
  title: string;
  summary: string;
  version: string;
  lastUpdated: string;
  status: LegalPolicyStatus;
  sections: LegalPolicySection[];
  ownerDecisions: string[];
};

const version = 'draft-2026-10-10';
const lastUpdated = '10 October 2026';
const common = { version, lastUpdated, status: 'review_required' as const };

export const legalPolicies: LegalPolicy[] = [
  {
    ...common, slug: 'terms', title: 'Terms of Use and Sale',
    summary: 'The master terms for use of ESHANTVA public services, accepted quotations and orders.',
    sections: [
      { heading: 'Using the website', paragraphs: ['Use the website only for lawful enquiries, account access and orders. A submitted enquiry is not automatically accepted.'] },
      { heading: 'Orders and quotations', paragraphs: ['A custom or bulk request proceeds only after ESHANTVA confirms feasibility, scope, price and applicable terms. Website content does not create an unconditional production promise.'] },
      { heading: 'Customer information', paragraphs: ['Customers are responsible for accurate specifications, delivery information and authority to provide submitted files or references.'] },
      { heading: 'Linked policies', paragraphs: ['Focused policies below form part of these terms where they apply to a request, order, payment, delivery, file-handling matter.'] },
    ],
    ownerDecisions: ['Confirm governing law and dispute forum with qualified counsel.', 'Confirm business contact and grievance response process before publication.'],
  },
  {
    ...common, slug: 'privacy', title: 'Privacy Policy',
    summary: 'How website, account, enquiry and order information is handled.',
    sections: [
      { heading: 'Information collected', paragraphs: ['ESHANTVA may collect information supplied through accounts, enquiries, orders and support requests, plus limited security and operational metadata.'] },
      { heading: 'Purpose and access', paragraphs: ['Information is used to respond, assess requirements, manage accepted work, provide secure account access and meet applicable obligations. Access is limited by role and purpose.'] },
      { heading: 'Retention and rights', paragraphs: ['Retention depends on the record and applicable business or legal need. Verified requests to access or correct information will be handled through the approved support route.'] },
    ],
    ownerDecisions: ['Approve retention schedule and lawful-basis wording.', 'Confirm privacy contact before publication.'],
  },
  {
    ...common, slug: 'custom-order-policy', title: 'Custom Order Policy',
    summary: 'Review, feasibility, quotation and approval rules for custom requirements.',
    sections: [
      { heading: 'Review first', paragraphs: ['Submission starts a feasibility review. Acceptance, price, production method and delivery timing are confirmed only for an accepted requirement.'] },
      { heading: 'Specification and changes', paragraphs: ['The accepted specification and any customer-visible approval artifact control production. Later changes may require a revised quotation, approval or production work.'] },
      { heading: 'Customer responsibility', paragraphs: ['Customers must provide accurate dimensions, intended-use information and files they are authorized to use.'] },
    ],
    ownerDecisions: ['Approve change/cancellation timing rules.', 'Approve any restricted-use categories.'],
  },
  {
    ...common, slug: 'payment-policy', title: 'Payment Policy',
    summary: 'How payment terms are communicated for accepted work.',
    sections: [
      { heading: 'Confirmed amount', paragraphs: ['Payment is requested only against an accepted product or quotation using the applicable payment route. Frontend estimates are not authoritative.'] },
      { heading: 'Payment terms', paragraphs: ['Standard and lower-value accepted orders may require full payment. Qualifying high-value terms may be agreed individually in writing.'] },
    ],
    ownerDecisions: ['Confirm supported payment methods and invoicing practice before publication.'],
  },
  {
    ...common, slug: 'cancellation-refund', title: 'Cancellation and Refund Policy',
    summary: 'How cancellation and refund requests are assessed.',
    sections: [
      { heading: 'Requesting cancellation', paragraphs: ['A cancellation request is assessed against order status, approved custom work and costs already committed. Submission of a request does not itself cancel an order.'] },
      { heading: 'Refund assessment', paragraphs: ['Any refund eligibility, deductions and method are communicated for the specific order and applicable law. No universal refund window is stated in this draft.'] },
    ],
    ownerDecisions: ['Approve retail and custom cancellation windows.', 'Approve refund processing timelines and deductions.'],
  },
  {
    ...common, slug: 'shipping-policy', title: 'Shipping, Delivery and Pickup Policy',
    summary: 'The principles for shipping, local delivery and arranged pickup.',
    sections: [
      { heading: 'Availability', paragraphs: ['Delivery method and charges depend on the accepted order, destination and current site configuration. Requested dates are not guaranteed until confirmed.'] },
      { heading: 'Receipt', paragraphs: ['Customers should check shipment condition and report a delivery issue through the approved support route with relevant evidence.'] },
    ],
    ownerDecisions: ['Confirm carriers, service areas and claims window before publication.'],
  },
  {
    ...common, slug: 'damage-replacement-warranty', title: 'Damage, Replacement and Warranty Policy',
    summary: 'How reported damage, defects and replacement requests are reviewed.',
    sections: [
      { heading: 'Report and review', paragraphs: ['Reported damage or defect is reviewed against delivery evidence, the accepted specification, use conditions and applicable consumer rights.'] },
      { heading: 'Outcome', paragraphs: ['Repair, reprint, replacement, refund or another remedy is not automatic and is confirmed after review.'] },
    ],
    ownerDecisions: ['Define evidence and notification windows.', 'Confirm any product-specific warranty exclusions with counsel.'],
  },
  {
    ...common, slug: 'product-safety', title: 'Product Safety and Intended Use Policy',
    summary: 'Customer responsibilities and boundaries for intended-use information.',
    sections: [
      { heading: 'Intended use', paragraphs: ['Customers must disclose relevant heat, load, water, electrical, food-contact, child-use or other safety conditions when applicable.'] },
      { heading: 'No unsupported certification', paragraphs: ['A produced item is not represented as certified, engineering-validated or suitable for a regulated use unless separately documented.'] },
    ],
    ownerDecisions: ['Approve prohibited and restricted-use list before publication.'],
  },
  {
    ...common, slug: 'file-ip-policy', title: 'File and Intellectual Property Policy',
    summary: 'Authority, confidentiality and use boundaries for customer-submitted files.',
    sections: [
      { heading: 'Authority to submit', paragraphs: ['Customers must own or have permission to use and submit each design, logo, image, model and other file.'] },
      { heading: 'Limited operational use', paragraphs: ['Submitted files are used to assess and fulfil the applicable request and are not made public by default. Publication requires a separate approval where applicable.'] },
      { heading: 'Restricted content', paragraphs: ['ESHANTVA may refuse content that appears unlawful, unsafe, infringing or outside current capability.'] },
    ],
    ownerDecisions: ['Approve takedown and infringement-notice procedure.', 'Approve retention/deletion schedule for rejected and completed files.'],
  },
  {
    ...common, slug: 'grievance-support', title: 'Grievance and Support Policy',
    summary: 'How customers can raise support or grievance matters.',
    sections: [
      { heading: 'Use the appropriate route', paragraphs: ['Use authenticated order access where available, or the approved Contact route, and provide only information needed to identify the matter.'] },
      { heading: 'Review', paragraphs: ['ESHANTVA records and routes the matter to an authorized person. This draft does not invent a response deadline or escalation contact.'] },
    ],
    ownerDecisions: ['Designate grievance contact and response/escalation timing before publication.'],
  },
];

export function getLegalPolicy(slug: string) { return legalPolicies.find((policy) => policy.slug === slug); }
export function getCustomerLegalPolicies() { return legalPolicies.filter((policy) => !policy.slug.startsWith('recruitment-')); }
export function getPublicLegalPolicyRoutes() { return getCustomerLegalPolicies().filter((policy) => policy.status === 'published').map((policy) => `/${policy.slug}`); }
