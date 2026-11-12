import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CartPageClient } from '@/components/cart/CartPageClient';
import { retailVisibility } from '@/config/retailVisibility';
import { RetailUnavailable } from '@/components/retail/RetailUnavailable';

export const metadata: Metadata = {
  title: retailVisibility.isInternal ? 'Your Cart' : 'Cart unavailable',
  description: retailVisibility.isInternal ? 'Review configured ESHANTVA products and quantities before checkout.' : 'ESHANTVA retail surfaces are not publicly available.',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  if (!retailVisibility.isInternal) return <RetailUnavailable />;
  return (
    <>
      <SiteHeader />
      <main className="cart-page shell">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">Cart</span></nav>
        <span className="section-kicker">YOUR SELECTION</span>
        <h1>Your Cart.</h1>
        <CartPageClient />
      </main>
      <Footer />
    </>
  );
}
