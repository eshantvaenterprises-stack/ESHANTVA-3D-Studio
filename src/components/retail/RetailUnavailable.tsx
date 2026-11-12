import Link from 'next/link';
import { ArrowRight, EyeOff, ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';

export function RetailUnavailable({ area = 'Shop' }: { area?: 'Shop' | 'Cart' | 'Checkout' }) {
  return <>
    <SiteHeader />
    <main className="retail-unavailable shell">
      <EyeOff size={42} strokeWidth={1.4} aria-hidden="true" />
      <span className="section-kicker">PUBLIC BUSINESS SURFACE</span>
      <h1>{area} is not publicly available.</h1>
      <p>The retail catalogue is still under internal review. No sample products, development prices or unfinished checkout data are published here.</p>
      <div className="retail-unavailable-note"><ShieldCheck size={18} aria-hidden="true" /><span>Custom and larger-quantity requirements can still be submitted through the appropriate reviewed service route.</span></div>
      <div className="retail-unavailable-actions"><Link className="button button-primary" href="/custom-order">Start a Custom Order <ArrowRight size={16} /></Link><Link className="button button-secondary" href="/bulk-order">Bulk Order</Link><Link className="text-link" href="/services">Explore Services</Link></div>
    </main>
    <Footer />
  </>;
}
