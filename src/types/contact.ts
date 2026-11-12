import type { AppointmentPeriod } from '@/config/contact';

export type ContactReason =
  | 'general_business'
  | 'product_question'
  | 'custom_order_question'
  | 'bulk_order_question'
  | 'appointment_request'
  | 'existing_order_request'
  | 'collaboration_business'
  | 'other';

export type ContactSubmission = {
  reason: ContactReason;
  name: string;
  email: string;
  orderReference: string;
  message: string;
  website: string;
};

export type AppointmentSubmission = {
  name: string;
  email: string;
  purpose: string;
  preferredDate: string;
  preferredPeriod: AppointmentPeriod;
  specificTime: string;
  orderReference: string;
  notes: string;
  website: string;
};

export type ContactRequestResponse = {
  publicReference: string;
  submittedAt: string;
};
