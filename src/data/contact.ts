import {
  BriefcaseBusiness,
  Boxes,
  CalendarClock,
  CircleHelp,
  PackageSearch,
  Shapes,
  ShoppingBag,
  Wrench,
} from 'lucide-react';
import type { ContactReason } from '@/types/contact';
import { retailVisibility } from '@/config/retailVisibility';

export const contactReasons: ReadonlyArray<{ value: ContactReason; label: string }> = [
  { value: 'general_business', label: 'General Business Enquiry' },
  { value: 'product_question', label: 'Product Question' },
  { value: 'custom_order_question', label: 'Custom Order Question' },
  { value: 'bulk_order_question', label: 'Bulk Order Question' },
  { value: 'appointment_request', label: 'Appointment Request' },
  { value: 'existing_order_request', label: 'Existing Order / Request' },
  { value: 'collaboration_business', label: 'Collaboration / Business' },
  { value: 'other', label: 'Other' },
];

const allContactRouteCards = [
  { label: 'General Question', description: 'For general business questions or guidance.', href: '#contact-form', icon: CircleHelp },
  { label: 'Custom Requirement', description: 'Use the dedicated form for files, drawings, references or a specific requirement.', href: '/custom-order', icon: Wrench },
  { label: 'Larger Quantity', description: 'Use the Bulk Order route for larger quantities or batch requirements.', href: '/bulk-order', icon: Boxes },
  { label: 'Product Question', description: 'Start from the Shop when the question relates to an existing product.', href: '/shop', icon: ShoppingBag },
] as const;
export const contactRouteCards = allContactRouteCards.filter((card) => retailVisibility.isInternal || card.href !== '/shop');

export const contactReasonRoutes: Partial<Record<ContactReason, { href: string; label: string; icon: typeof Shapes }>> = {
  custom_order_question: { href: '/custom-order', label: 'Open Custom Order', icon: Wrench },
  bulk_order_question: { href: '/bulk-order', label: 'Open Bulk Order', icon: Boxes },
  product_question: retailVisibility.isInternal
    ? { href: '/shop', label: 'Browse Shop', icon: PackageSearch }
    : { href: '#contact-form', label: 'Use Contact Form', icon: PackageSearch },
  appointment_request: { href: '#appointment', label: 'Go to Appointment Request', icon: CalendarClock },
};

export const visitExpectations = [
  'Visits are by prior appointment only.',
  'Submitting a visit request does not confirm an appointment.',
  'ESHANTVA confirms availability separately before a visit.',
  'Custom files and technical project submissions belong in the Custom Order flow, not the general contact form.',
] as const;

export const businessContactUses = [
  'General enquiry',
  'Business enquiry',
  'Non-urgent support',
] as const;

export const contactTrustNotes = [
  { title: 'Right route first', description: 'Dedicated Custom and Bulk forms collect the information those workflows actually need.', icon: Shapes },
  { title: 'Minimal contact data', description: 'General contact does not require a phone number or generic file upload.', icon: BriefcaseBusiness },
] as const;
