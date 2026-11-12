import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';
import { ServicesHero } from '@/components/services/ServicesHero';
import { StartingPointGrid } from '@/components/services/StartingPointGrid';
import { PathToProduct } from '@/components/services/PathToProduct';
import { CapabilityNavigation, CapabilityOverview } from '@/components/services/CapabilityOverview';
import { ServiceDetails } from '@/components/services/ServiceDetails';
import { CapabilityTransparency } from '@/components/services/CapabilityTransparency';
import { CustomerInputTypes, FeasibilityProcess, RouteComparison } from '@/components/services/CustomerGuidance';
import { ActionSections, FinalServicesCTA, LocalOnlineSection, MaterialsCrossLink } from '@/components/services/ServiceCtas';
import { ServicesFAQ } from '@/components/services/ServicesFAQ';
import { ServiceAnchorHandler } from '@/components/services/ServiceAnchorHandler';
import { enabledServiceCapabilities } from '@/data/services';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: '3D Printing Services & Custom Production',
  description: 'Explore custom 3D printing, personalisation, selected design support, prototype and functional-part requests, and small-batch production in Biswanath, Assam.',
  alternates: siteConfig.siteUrl ? { canonical: '/services/' } : undefined,
  robots: { index: true, follow: true },
};

export default function ServicesPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}/services/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: '3D Printing Services & Custom Production', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(siteConfig.siteUrl ? { item: `${siteConfig.siteUrl}/` } : {}) },
        { '@type': 'ListItem', position: 2, name: 'Services', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
      ...enabledServiceCapabilities.map((service) => ({ '@type': 'Service', name: service.title, description: service.shortDescription, areaServed: { '@type': 'City', name: 'Biswanath' } })),
    ],
  };

  return <>
    <ServiceAnchorHandler />
    <SiteHeader />
    <main>
      <ServicesHero />
      <StartingPointGrid />
      <PathToProduct />
      <CapabilityNavigation />
      <CapabilityOverview />
      <ServiceDetails />
      <CapabilityTransparency />
      <CustomerInputTypes />
      <FeasibilityProcess />
      <RouteComparison />
      <MaterialsCrossLink />
      <LocalOnlineSection />
      <ActionSections />
      <ServicesFAQ />
      <FinalServicesCTA />
    </main>
    <Footer />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
  </>;
}
