import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomerOrderDetailClient } from '@/components/order-detail/CustomerOrderDetailClient';

export const metadata: Metadata = {
  title: 'Order Details | ESHANTVA 3D Studio',
  description: 'Customer order details and status for ESHANTVA 3D Studio.',
  robots: { index: false, follow: false },
};

export default function CustomerOrderDetailShellPage() {
  return (
    <>
      <SiteHeader />
      <main className="order-detail-page">
        <CustomerOrderDetailClient />
      </main>
      <Footer />
    </>
  );
}
