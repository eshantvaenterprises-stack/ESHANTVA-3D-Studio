import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { ServiceAnchorHandler } from '@/components/services/ServiceAnchorHandler';
import {
  CustomerPathSections,
  DeliveryAndChanges,
  HowItWorksFaq,
  HowItWorksFinalCta,
  HowItWorksHero,
  OrderStatusJourney,
  OverallJourney,
  PricingApprovalPayment,
  RouteDecisionSection,
  StartingPathSelector,
  TrackingPreview,
} from '@/components/how-it-works/HowItWorksSections';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'How Custom 3D Printing Orders Work',
  description: 'Understand the ESHANTVA Shop, Custom Order and Bulk Order paths, including review, pricing confirmation, payment, production and delivery.',
  alternates: siteConfig.siteUrl ? { canonical: '/how-it-works/' } : undefined,
  robots: { index: true, follow: true },
  openGraph: {
    title: 'How Custom 3D Printing Orders Work | ESHANTVA 3D Studio',
    description: 'A clear guide to ESHANTVA Shop, Custom and Bulk order pathways from starting point through delivery.',
    type: 'website',
  },
};

export default function HowItWorksPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/how-it-works/` : undefined;
  const homeUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'How Custom 3D Printing Orders Work', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(homeUrl ? { item: homeUrl } : {}) },
        { '@type': 'ListItem', position: 2, name: 'How It Works', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
    ],
  };

  return (
    <>
      <ServiceAnchorHandler />
      <SiteHeader />
      <main>
        <div className="shell hiw-breadcrumb-wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">How It Works</span></nav>
        </div>
        <HowItWorksHero />
        <StartingPathSelector />
        <OverallJourney />
        <CustomerPathSections />
        <PricingApprovalPayment />
        <OrderStatusJourney />
        <DeliveryAndChanges />
        <TrackingPreview />
        <RouteDecisionSection />
        <HowItWorksFaq />
        <HowItWorksFinalCta />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
