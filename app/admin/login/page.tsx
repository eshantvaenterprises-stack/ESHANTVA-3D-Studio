import type { Metadata } from 'next';
import { AdminLoginClient } from '@/components/admin/AdminLoginClient';

export const metadata: Metadata = {
  title: 'Admin Access',
  description: 'Authorized ESHANTVA 3D Studio admin access.',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <main className="admin-login-page"><AdminLoginClient /></main>;
}
