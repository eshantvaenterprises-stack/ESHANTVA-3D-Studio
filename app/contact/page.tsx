import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import {
  AppointmentSection,
  ContactFinalCta,
  ContactFormSection,
  ContactHero,
  ContactIdentity,
  ContactOptions,
  ContactRoutes,
  LocationSection,
  VisitExpectations,
} from '@/components/contact/ContactSections';
import { siteConfig } from '@/config/site';
import { BusinessContactChannels } from '@/components/contact/BusinessContactChannels';

export const metadata: Metadata = {
  title: 'Contact & Appointment | ESHANTVA 3D Studio',
  description: 'Contact ESHANTVA 3D Studio in Biswanath for general enquiries, appointment requests and guidance to the appropriate product, custom or bulk-order pathway.',
  alternates: { canonical: '/contact/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Contact & Appointment | ESHANTVA 3D Studio',
    description: 'General contact, appointment requests and route guidance for ESHANTVA 3D Studio in Biswanath.',
    type: 'website',
  },
};

export default function ContactPage() {
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/contact/` : undefined;
  const homeUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'Contact & Appointment', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(homeUrl ? { item: homeUrl } : {}) },
        { '@type': 'ListItem', position: 2, name: 'Contact & Appointment', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
    ],
  };

  return <><SiteHeader /><main className="ct-page"><div className="shell ct-breadcrumb-wrap"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">Contact &amp; Appointment</span></nav></div><ContactHero /><ContactRoutes /><BusinessContactChannels /><ContactOptions /><ContactFormSection /><AppointmentSection /><LocationSection /><VisitExpectations /><ContactIdentity /><ContactFinalCta /></main><Footer /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /></>;
}
