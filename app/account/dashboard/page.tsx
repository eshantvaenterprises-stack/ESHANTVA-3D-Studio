import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomerDashboardClient } from '@/components/dashboard/CustomerDashboardClient';

export const metadata: Metadata = {
  title: 'Customer Dashboard',
  description: 'Customer account overview for ESHANTVA 3D Studio.',
  robots: { index: false, follow: false },
};

export default function CustomerDashboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="dashboard-page">
        <CustomerDashboardClient />
      </main>
      <Footer />
    </>
  );
}
