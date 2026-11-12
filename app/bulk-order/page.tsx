import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowDown, Boxes, ClipboardCheck, MapPin, Repeat2 } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { BulkOrderWizard } from '@/components/bulk-order/BulkOrderWizard';
import { getProducts } from '@/repositories/productRepository';
import { bulkFaqIds, getFaqsByIds } from '@/data/faqs';
import { retailVisibility } from '@/config/retailVisibility';

export const metadata: Metadata = {
  title: 'Bulk 3D Printing Orders',
  description: 'Request larger quantities of existing, personalized or custom 3D-printed products. Bulk requirements are reviewed for pricing, production feasibility and delivery.',
  alternates: { canonical: '/bulk-order/' },
};


export default function BulkOrderPage() {
  const products = retailVisibility.isInternal ? getProducts() : [];
  const faqs = getFaqsByIds(bulkFaqIds);
  return <><SiteHeader /><main>
    <section className="bo-hero"><div className="shell bo-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">Bulk Order</span></div><div className="shell co-hero-inner"><div><span className="section-kicker">BULK ORDERS</span><h1>Need more than one?</h1><p>{retailVisibility.isInternal ? 'Order larger quantities of existing ESHANTVA products, request personalized batches, or submit a custom bulk requirement for review.' : 'Submit a custom bulk production requirement for feasibility and commercial review.'}</p><p className="bo-hero-note">Pricing, production requirements and payment terms are confirmed after review where applicable.</p></div><div className="co-hero-aside"><span><Boxes size={19} /><strong>{retailVisibility.isInternal ? 'Catalog + Custom' : 'Custom Requirements'}</strong></span><span><Repeat2 size={19} /><strong>One-time or Repeat</strong></span><span><MapPin size={19} /><strong>Pan-India Shipping</strong></span><a href="#bulk-enquiry">Build your enquiry <ArrowDown size={15} /></a></div></div><div className="shell co-chips">{retailVisibility.isInternal && <><span>Existing products</span><span>Personalized batches</span></>}<span>Custom requirements</span><span>Multiple items</span>{retailVisibility.isInternal && <Link href="/shop">Browse Products</Link>}</div></section>
    <section id="bulk-enquiry" className="co-wizard-section"><Suspense fallback={<div className="shell co-form-loading">Preparing the bulk enquiry builder…</div>}><BulkOrderWizard products={products} /></Suspense></section>
    <section className="bo-next"><div className="shell"><span className="section-kicker">WHAT HAPPENS NEXT</span><h2>From enquiry to an accepted order.</h2><div>{[['01','Review','The product, quantity, customization, files and delivery requirement are assessed.'],['02','Quotation','Pricing and feasible commercial terms are prepared where applicable.'],['03','Acceptance','You review the quotation and any order-specific terms.'],['04','Order','Only an accepted request proceeds to payment and production.']].map(([n,title,copy]) => <article key={n}><b>{n}</b><ClipboardCheck size={20} /><strong>{title}</strong><p>{copy}</p></article>)}</div></div></section>
    <section className="bo-faq shell"><div><span className="section-kicker">BULK FAQ</span><h2>Useful before you submit.</h2><p>Bulk pricing is reviewed according to product, quantity, customization and production requirements.</p></div><div>{faqs.map((faq) => <details key={faq.id}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
  </main><Footer /></>;
}

