import { z } from 'zod';

export const checkoutDeliveryMethodSchema = z.enum(['pickup', 'local_delivery', 'shipping']);
export type CheckoutDeliveryMethod = z.infer<typeof checkoutDeliveryMethodSchema>;

export const checkoutContactSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  mobile: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,19}$/, 'Enter a valid mobile number.'),
  companyName: z.string().trim().max(160).optional().default(''),
});
export type CheckoutContact = z.infer<typeof checkoutContactSchema>;

export const checkoutAddressSchema = z.object({
  recipientName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,19}$/),
  addressLine1: z.string().trim().min(3).max(180),
  addressLine2: z.string().trim().max(180).optional().default(''),
  locality: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pinCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code.'),
  country: z.literal('India'),
});
export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>;

export type CheckoutCartLineIntent = {
  productId: string;
  slug: string;
  configurationSignature: string;
  quantity: number;
  selectedOptions: Array<{ optionId: string; valueId?: string; valueLabel: string }>;
};

export type CheckoutSubmission = {
  idempotencyKey: string;
  contact: CheckoutContact;
  deliveryMethod: CheckoutDeliveryMethod;
  address: CheckoutAddress | null;
  cart: CheckoutCartLineIntent[];
};

export type CheckoutResolvedLine = {
  productId: string;
  slug: string;
  title: string;
  quantity: number;
  unitPricePaise: number;
  lineSubtotalPaise: number;
  selectedOptions: Array<{ optionId: string; label: string; valueId?: string; valueLabel: string }>;
};

export type CheckoutTotals = {
  currency: 'INR';
  itemSubtotalPaise: number;
  shippingPaise: number;
  taxAmountPaise: number;
  taxAddedPaise: number;
  totalPaise: number;
};

export type CheckoutReviewResponse = {
  totals: CheckoutTotals;
  items: CheckoutResolvedLine[];
  deliveryLabel: string;
  taxLabel: string;
};

export type CheckoutPrepareResponse = CheckoutReviewResponse & {
  orderReference: string;
  orderCreated: boolean;
  payment: { mode: 'redirect'; redirectUrl: string };
};

export type CheckoutOrderStatus = {
  orderReference: string;
  orderStatus: string;
  paymentStatus: string;
  totalPaise: number;
  currency: 'INR';
  paid: boolean;
};
