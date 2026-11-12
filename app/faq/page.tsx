import { PublishedContent } from '@/components/website-features/PublishedContent';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CircleHelp,
  FilePenLine,
  PackageSearch,
  ShoppingBag,
} from 'lucide-react';
import { FaqExplorer } from '@/components/faq/FaqExplorer';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { businessIdentity } from '@/config/businessIdentity';
import { siteConfig } from '@/config/site';
import { enabledFaqs, faqCategories } from '@/data/faqs';
import { retailVisibility } from '@/config/retailVisibility';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | ESHANTVA 3D Studio',
  description: 'Find answers about ESHANTVA 3D Studio products, custom 3D printing requests, bulk orders, materials, payments, shipping and local pickup.',
  alternates: { canonical: '/faq/' },
  robots: { index: true, follow: true },
};

export default function FaqPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/faq/` : undefined;
  const homeUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/` : undefined;
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Frequently Asked Questions | ESHANTVA 3D Studio',
    description: metadata.description,
    url: pageUrl,
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: pageUrl },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="fq-page">
        <div className="shell fq-breadcrumb-wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><span aria-current="page">FAQ</span>
          </nav>
        </div>

        <section className="fq-hero" aria-labelledby="faq-page-heading">
          <div className="shell fq-hero-grid">
            <div>
              <span className="section-kicker">FAQ</span>
              <h1 id="faq-page-heading">Quick answers before you order.</h1>
              <p>Find answers about products, custom requests, bulk orders, materials, payment, delivery and how ESHANTVA works.</p>
            </div>
            <aside aria-label="FAQ page focus">
              <CircleHelp size={28} aria-hidden="true" />
              <strong>Practical answers for choosing and managing your order.</strong>
              <p>Use the guidance here to choose a route, prepare a request and understand the next step.</p>
              <a href="#faq-search-heading">Search questions <ArrowRight size={15} /></a>
            </aside>
          </div>
        </section>

        <FaqExplorer categories={faqCategories} items={enabledFaqs} />

        <section className="section-dark fq-route-section" aria-labelledby="faq-route-heading">
          <div className="shell">
            <div className="fq-route-heading">
              <span className="section-kicker">STILL NOT SURE WHERE TO START?</span>
              <h2 id="faq-route-heading">Choose by what you need, not by website jargon.</h2>
              <p>The three routes begin differently, then move through the appropriate review, confirmation and delivery path.</p>
            </div>
            <div className="fq-route-grid">
              {retailVisibility.isInternal && <Link href="/shop"><ShoppingBag size={24} /><span>01 · EXISTING PRODUCT</span><strong>I want an existing product</strong><em>Shop <ArrowRight size={15} /></em></Link>}
              <Link href="/custom-order"><FilePenLine size={24} /><span>02 · CUSTOM REQUIREMENT</span><strong>I need something custom</strong><em>Custom Order <ArrowRight size={15} /></em></Link>
              <Link href="/bulk-order"><Boxes size={24} /><span>03 · LARGER QUANTITY</span><strong>I need a larger quantity</strong><em>Bulk Order <ArrowRight size={15} /></em></Link>
            </div>
            <div className="fq-crosslinks">
              <Link href="/services">Explore Services &amp; Capabilities <ArrowRight size={14} /></Link>
              <Link href="/how-it-works">See How It Works <ArrowRight size={14} /></Link>
              <Link href="/materials">Explore Materials &amp; Options <ArrowRight size={14} /></Link>
            </div>
          </div>
        </section>

        <section className="fq-business shell" aria-labelledby="faq-business-heading">
          <PackageSearch size={32} aria-hidden="true" />
          <div>
            <span className="section-kicker">BUSINESS INFORMATION</span>
            <h2 id="faq-business-heading">Verified business information, kept clear and concise.</h2>
            <p>{businessIdentity.tradeName} · {businessIdentity.constitution} · GST registered · {businessIdentity.publicLocation}</p>
            <small>The shared Footer provides the same verified public business identity across the website.</small>
          </div>
          <Link className="button button-secondary" href="/how-it-works">Understand the order path <ArrowRight size={15} /></Link>
        </section>

        <section className="fq-final shell" aria-labelledby="faq-final-heading">
          <div>
            <span className="section-kicker">READY FOR THE NEXT STEP?</span>
            <h2 id="faq-final-heading">Start with what you have.</h2>
            <p>{retailVisibility.isInternal ? 'Browse an existing product, send a custom requirement or build a bulk enquiry.' : 'Send a custom requirement or build a bulk enquiry.'} The appropriate route can handle the next decision from there.</p>
          </div>
          <div>
            {retailVisibility.isInternal && <Link className="button button-primary" href="/shop">Browse Products <ArrowRight size={15} /></Link>}
            <Link className="button button-secondary" href="/custom-order">Start a Custom Order</Link>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
        <PublishedContent kind="faq"/>
      </main>
      <Footer />
    </>
  );
}
