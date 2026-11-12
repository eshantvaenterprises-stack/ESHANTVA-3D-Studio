export type OrderDetailOption = {
  label: string;
  value: string;
};

export type OrderDetailItem = {
  title: string;
  quantity: number;
  unitPricePaise: number;
  lineSubtotalPaise: number;
  selectedOptions: OrderDetailOption[];
};

export type OrderDeliverySummary = {
  recipientName: string;
  addressLine1: string;
  addressLine2: string | null;
  locality: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  country: string;
};

export type OrderTimelineItem = {
  key: string;
  label: string;
  occurredAt: string;
};

export type CustomerOrderDetail = {
  reference: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentLabel: string;
  paidAt: string | null;
  currency: 'INR';
  itemSubtotalPaise: number;
  shippingPaise: number;
  taxAmountPaise: number;
  taxAddedPaise: number;
  totalPaise: number;
  taxLabel: string;
  deliveryMethod: string;
  deliveryLabel: string;
  items: OrderDetailItem[];
  delivery: OrderDeliverySummary | null;
  timeline: OrderTimelineItem[];
};

export type OrderDetailLoadResult =
  | { kind: 'success'; data: CustomerOrderDetail }
  | { kind: 'unavailable' };
