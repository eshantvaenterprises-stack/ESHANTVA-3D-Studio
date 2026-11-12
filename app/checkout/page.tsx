import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { CheckoutPageClient } from '@/components/checkout/CheckoutPageClient';
import { retailVisibility } from '@/config/retailVisibility';
import { RetailUnavailable } from '@/components/retail/RetailUnavailable';

export const metadata: Metadata = {
  title: retailVisibility.isInternal ? 'Checkout' : 'Checkout unavailable',
  description: retailVisibility.isInternal ? 'Review delivery details and continue through ESHANTVA secure checkout.' : 'ESHANTVA retail surfaces are not publicly available.',
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  if (!retailVisibility.isInternal) return <RetailUnavailable />;
  return <><SiteHeader /><main className="ck-page shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><Link href="/cart">Cart</Link><ChevronRight size={14} /><span aria-current="page">Checkout</span></nav><span className="section-kicker">SECURE CHECKOUT</span><h1>Checkout.</h1><p className="ck-page-intro">Your cart choices are revalidated before an order is created. Delivery, applicable tax and the final payable amount are confirmed from authoritative order data.</p><CheckoutPageClient /></main><Footer /></>;
}
