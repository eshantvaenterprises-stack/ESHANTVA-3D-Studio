export type DashboardAccount = {
  displayName: string | null;
  email: string;
  statusLabel: string;
};

export type DashboardOrder = {
  reference: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentLabel: string;
  totalPaise: number;
  currency: 'INR';
  deliveryMethod: string;
  deliveryLabel: string;
};

export type DashboardRequest = {
  reference: string;
  submittedAt: string;
  status: string;
  statusLabel: string;
};

export type DashboardActivity = {
  id: string;
  kind: 'order' | 'payment' | 'order_status' | 'custom_request' | 'bulk_request';
  label: string;
  reference: string;
  occurredAt: string;
};

export type CustomerDashboardData = {
  account: DashboardAccount;
  orders: {
    total: number;
    active: number;
    latest: DashboardOrder | null;
    recent: DashboardOrder[];
  };
  customRequests: {
    total: number;
    recent: DashboardRequest[];
  };
  bulkRequests: {
    total: number;
    recent: DashboardRequest[];
  };
  activity: DashboardActivity[];
};
