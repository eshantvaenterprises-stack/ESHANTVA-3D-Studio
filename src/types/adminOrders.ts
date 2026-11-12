import type { AdminRole } from '@/types/admin';

export const adminOrderStatuses = [
  'pending_payment','payment_processing','paid','under_review','confirmed','in_production','ready_for_pickup','shipped','delivered','cancelled','refunded',
] as const;
export const adminPaymentStatuses = ['not_started','pending','processing','paid','failed','cancelled','refunded'] as const;
export const adminDeliveryMethods = ['pickup','local_delivery','shipping'] as const;
export type AdminOrderStatus = typeof adminOrderStatuses[number];
export type AdminPaymentStatus = typeof adminPaymentStatuses[number];
export type AdminDeliveryMethod = typeof adminDeliveryMethods[number];
export type AdminOrderSort = 'newest'|'oldest';

export type AdminOrderListItem = {
  reference:string;
  createdAt:string;
  status:AdminOrderStatus;
  statusLabel:string;
  paymentStatus:AdminPaymentStatus;
  paymentLabel:string;
  deliveryMethod:AdminDeliveryMethod;
  deliveryLabel:string;
  totalPaise:number;
  currency:'INR';
};

export type AdminOrdersListData = {
  admin:{role:AdminRole;displayName:string|null};
  items:AdminOrderListItem[];
  pagination:{page:number;pageSize:number;total:number;totalPages:number};
  filters:{search:string;status:AdminOrderStatus|null;paymentStatus:AdminPaymentStatus|null;deliveryMethod:AdminDeliveryMethod|null;sort:AdminOrderSort};
};

export type AdminOrderItem = {
  title:string;
  quantity:number;
  unitPricePaise:number;
  lineSubtotalPaise:number;
  selectedOptions:Array<{label:string;value:string}>;
};

export type AdminOrderAddress = {
  recipientName:string;
  mobile:string;
  addressLine1:string;
  addressLine2:string|null;
  locality:string;
  city:string;
  district:string;
  state:string;
  pinCode:string;
  country:string;
};

export type AdminOrderTimelineItem = { label:string; fromStatus:string|null; toStatus:string|null; occurredAt:string };

export type AdminOrderDetailData = {
  admin:{role:AdminRole;displayName:string|null};
  order:{
    reference:string;
    createdAt:string;
    updatedAt:string;
    status:AdminOrderStatus;
    statusLabel:string;
    paymentStatus:AdminPaymentStatus;
    paymentLabel:string;
    currency:'INR';
    itemSubtotalPaise:number;
    shippingPaise:number;
    taxAmountPaise:number;
    taxAddedPaise:number;
    totalPaise:number;
    taxLabel:string;
    deliveryMethod:AdminDeliveryMethod;
    deliveryLabel:string;
    contactName:string;
    contactMobile:string;
    items:AdminOrderItem[];
    delivery:AdminOrderAddress|null;
    timeline:AdminOrderTimelineItem[];
    allowedTransitions:AdminOrderStatus[];
  };
};

export type AdminOrderTransitionResult = {
  orderReference:string;
  previousStatus:AdminOrderStatus;
  status:AdminOrderStatus;
  replayed:boolean;
};
