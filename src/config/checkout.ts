import { siteConfig } from '@/config/site';

export const checkoutConfig = {
  currency: 'INR' as const,
  country: 'India' as const,
  defaultPaymentRule: 'full_payment' as const,
  deliveryMethods: {
    pickup: {
      enabled: siteConfig.localPickup,
      label: 'Pickup',
      description: 'Collect after ESHANTVA confirms the order is ready. Pickup has no delivery charge.',
    },
    localDelivery: {
      enabled: process.env.NEXT_PUBLIC_CHECKOUT_LOCAL_DELIVERY_ENABLED === 'true',
      label: 'Local Delivery',
      description: 'Delivery availability and charge are validated from the destination details.',
    },
    shipping: {
      enabled: process.env.NEXT_PUBLIC_CHECKOUT_SHIPPING_ENABLED === 'true',
      label: 'Pan-India Shipping',
      description: 'Serviceability and shipping charge are validated from the delivery address.',
    },
  },
  limits: { cartLines: 50, fullName: 120, email: 254, mobile: 20, companyName: 160, addressLine: 180, locality: 120, city: 120, district: 120, state: 120 },
} as const;

export const enabledCheckoutDeliveryMethods = [
  checkoutConfig.deliveryMethods.pickup.enabled ? 'pickup' : null,
  checkoutConfig.deliveryMethods.localDelivery.enabled ? 'local_delivery' : null,
  checkoutConfig.deliveryMethods.shipping.enabled ? 'shipping' : null,
].filter((value): value is 'pickup' | 'local_delivery' | 'shipping' => Boolean(value));
