export type AdminRole = 'ADMIN' | 'STAFF';

export type AdminSessionProfile = {
  role: AdminRole;
  displayName: string | null;
};

export type AdminDashboardSummary = {
  totalOrders: number;
  activeOrders: number;
  customRequests: number;
  bulkRequests: number;
  pendingApprovals: number;
};

export type AdminDashboardData = {
  admin: AdminSessionProfile;
  summary: AdminDashboardSummary;
};
