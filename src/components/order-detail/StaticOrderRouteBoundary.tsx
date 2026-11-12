'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleSlash2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CustomerOrderDetailClient } from '@/components/order-detail/CustomerOrderDetailClient';
import { CustomerOrderFilesClient } from '@/components/customer-files/CustomerOrderFilesClient';
import { isOrderFilesPath } from '@/lib/customerFilesRoute';
import { isOrderDetailPath } from '@/lib/orderDetailApi';

function subscribeToLocation(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getCustomerRouteSnapshot() {
  const pathname = window.location.pathname;
  if (isOrderFilesPath(pathname, siteConfig.basePath)) return 'files';
  if (isOrderDetailPath(pathname, siteConfig.basePath)) return 'order';
  return 'none';
}


export function StaticOrderRouteBoundary() {
  const route = useSyncExternalStore(subscribeToLocation, getCustomerRouteSnapshot, () => 'none');

  if (route === 'files') {
    return (
      <>
        <SiteHeader />
        <main className="customer-files-page">
          <CustomerOrderFilesClient />
        </main>
        <Footer />
      </>
    );
  }

  if (route === 'order') {
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

  return (
    <>
      <SiteHeader />
      <main className="placeholder-page shell">
        <CircleSlash2 size={44} strokeWidth={1.4} />
        <span className="section-kicker">404 / NOT FOUND</span>
        <h1>That page does not exist.</h1>
        <p>Check the address or return to the ESHANTVA 3D Studio Home Page.</p>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Back to Home</Link>
      </main>
      <Footer />
    </>
  );
}
