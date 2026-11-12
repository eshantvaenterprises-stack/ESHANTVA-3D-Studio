import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { getProducts } from '@/repositories/productRepository';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';
import { RetailUnavailable } from '@/components/retail/RetailUnavailable';

export const metadata: Metadata = {
  title: retailVisibility.isInternal ? 'Shop 3D Printed Products' : 'Shop unavailable',
  description: retailVisibility.isInternal
    ? 'Browse ready-made, customisable and made-to-order 3D printed products from ESHANTVA 3D Studio.'
    : 'ESHANTVA retail surfaces are not publicly available.',
  alternates: retailVisibility.isInternal && siteConfig.siteUrl ? { canonical: '/shop/' } : undefined,
  robots: retailVisibility.isInternal && siteConfig.catalogMode === 'live' ? { index: true, follow: true } : { index: false, follow: false },
};

export default function ShopPage() {
  if (!retailVisibility.isInternal) return <RetailUnavailable />;
  const products = getProducts();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="shop-intro shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">Shop</span></nav>
          <div className="shop-intro-grid"><div><span className="section-kicker">PRODUCT CATALOGUE</span><h1>Shop 3D printed products.</h1></div><div><p>Explore practical, decorative and personalised pieces. Select a ready product or start with a requirement of your own.</p><Link className="text-link" href="/custom-order">Need something different? Start a custom order <ArrowRight size={16} /></Link></div></div>
          {siteConfig.catalogMode === 'sample' && <div className="catalog-notice" role="status"><strong>Catalogue preview</strong><span>Preview items are not available for purchase. Live products will be orderable only after their details and availability are confirmed.</span></div>}
        </section>
        <Suspense fallback={<div className="catalog-loading shell">Preparing the catalogue…</div>}><ShopCatalog products={products} /></Suspense>
        <section className="shop-custom-cta shell"><div><span className="section-kicker">CUSTOM PRODUCTION</span><h2>Didn&apos;t find what you had in mind?</h2><p>Submit a custom requirement with your file, drawing, dimensions or reference.</p></div><Link className="button button-primary" href="/custom-order">Start a Custom Order <ArrowRight size={16} /></Link></section>
      </main>
      <Footer />
    </>
  );
}
