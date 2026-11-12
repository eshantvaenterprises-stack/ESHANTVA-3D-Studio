import { PublishedContent } from '@/components/website-features/PublishedContent';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import {
  AboutFinalCta,
  AboutHero,
  AboutRouteSection,
  AudienceSection,
  ClearExpectationsSection,
  EcosystemSection,
  InnovationJourney,
  LocalAccessSection,
  PrototypeValueSection,
  PurposeSection,
  StartingPointSection,
  VerifiedIdentitySection,
} from '@/components/about/AboutSections';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'About ESHANTVA 3D Studio | Ideas, Prototypes & Custom 3D Production',
  description: 'Learn how ESHANTVA 3D Studio in Biswanath helps students, innovators, creators and small businesses move selected ideas, prototypes and product requirements toward physical form.',
  alternates: { canonical: '/about/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'About ESHANTVA 3D Studio | Ideas, Prototypes & Custom 3D Production',
    description: 'Why ESHANTVA exists, who it is built for, and how selected ideas and requirements can take a practical first step toward physical form.',
    type: 'website',
  },
};

export default function AboutPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/about/` : undefined;
  const homeUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'About ESHANTVA 3D Studio', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(homeUrl ? { item: homeUrl } : {}) },
        { '@type': 'ListItem', position: 2, name: 'About', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main className="ab-page">
        <div className="shell ab-breadcrumb-wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">About</span></nav>
        </div>
        <AboutHero />
        <PurposeSection />
        <StartingPointSection />
        <AudienceSection />
        <InnovationJourney />
        <PrototypeValueSection />
        <LocalAccessSection />
        <EcosystemSection />
        <ClearExpectationsSection />
        <VerifiedIdentitySection />
        <AboutRouteSection />
        <AboutFinalCta />
        <PublishedContent kind="about"/>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
