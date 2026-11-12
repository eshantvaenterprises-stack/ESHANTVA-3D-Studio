import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ServiceAnchorHandler } from '@/components/services/ServiceAnchorHandler';
import { AvailabilityGuide, ColorOptions } from '@/components/materials/ColorAndAvailability';
import { CustomMaterialCTA, MaterialsFAQ, NotSureGuidance } from '@/components/materials/MaterialGuidance';
import { MaterialComparison } from '@/components/materials/MaterialComparison';
import { MaterialOverview } from '@/components/materials/MaterialOverview';
import { MaterialsHero } from '@/components/materials/MaterialsHero';
import { NeedBasedMaterialGuide } from '@/components/materials/NeedBasedMaterialGuide';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: '3D Printing Materials & Options',
  description: 'Explore customer-facing material, colour and availability guidance for ESHANTVA 3D Studio products and custom requests in Biswanath, Assam.',
  alternates: siteConfig.siteUrl ? { canonical: '/materials/' } : undefined,
  robots: { index: true, follow: true },
};

export default function MaterialsPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}/materials/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: '3D Printing Materials & Options', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(siteConfig.siteUrl ? { item: `${siteConfig.siteUrl}/` } : {}) },
        { '@type': 'ListItem', position: 2, name: 'Materials & Options', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
    ],
  };

  return <>
    <ServiceAnchorHandler />
    <SiteHeader />
    <main>
      <MaterialsHero />
      <NeedBasedMaterialGuide />
      {siteConfig.features.materials.publicGuideEnabled && <MaterialOverview />}
      <ColorOptions />
      <AvailabilityGuide />
      <NotSureGuidance />
      <MaterialComparison />
      <CustomMaterialCTA />
      <MaterialsFAQ />
    </main>
    <Footer />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
  </>;
}
