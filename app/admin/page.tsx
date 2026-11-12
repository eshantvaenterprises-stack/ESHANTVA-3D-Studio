import type { Metadata } from 'next';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'ESHANTVA 3D Studio operations dashboard.',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
