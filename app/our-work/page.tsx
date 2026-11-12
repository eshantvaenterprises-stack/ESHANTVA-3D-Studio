import { PublishedContent } from '@/components/website-features/PublishedContent';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ProjectGallery } from '@/components/our-work/ProjectGallery';
import {
  FeaturedProjectStories,
  OurWorkActions,
  OurWorkHero,
  PortfolioLaunchState,
  RequirementToResult,
} from '@/components/our-work/OurWorkSections';
import { siteConfig } from '@/config/site';
import { getFeaturedProjects, getPublishedProjects, isPortfolioPubliclyEnabled } from '@/repositories/projectRepository';

const publicProjects = getPublishedProjects();
const portfolioIsLive = isPortfolioPubliclyEnabled() && publicProjects.length > 0;

export const metadata: Metadata = {
  title: 'Our Work & 3D Printing Projects',
  description: portfolioIsLive
    ? 'Explore selected ESHANTVA 3D Studio products and custom 3D printing work approved for public display, including personalised, functional, prototype and small-batch requirements.'
    : 'See how ESHANTVA 3D Studio turns files, drawings, dimensions and ideas into reviewable production requests. Verified project stories will appear as approved work becomes available.',
  alternates: siteConfig.siteUrl ? { canonical: '/our-work/' } : undefined,
  robots: portfolioIsLive ? { index: true, follow: true } : { index: false, follow: true },
  openGraph: {
    title: 'Our Work & 3D Printing Projects | ESHANTVA 3D Studio',
    description: portfolioIsLive
      ? 'Selected ESHANTVA work approved for public display.'
      : 'A truthful launch-state portfolio route showing how requirements move toward physical results.',
    type: 'website',
  },
};

export default function OurWorkPage() {
  const projects = getPublishedProjects();
  const featuredProjects = getFeaturedProjects(3);
  const hasProjects = projects.length > 0;
  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/our-work/` : undefined;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'Our Work & 3D Printing Projects', description: metadata.description, ...(pageUrl ? { url: pageUrl } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', ...(siteConfig.siteUrl ? { item: `${siteConfig.siteUrl}${siteConfig.basePath}/` } : {}) },
        { '@type': 'ListItem', position: 2, name: 'Our Work', ...(pageUrl ? { item: pageUrl } : {}) },
      ] },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main>
        <div className="shell ow-breadcrumb-wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><span aria-current="page">Our Work</span></nav>
        </div>
        <OurWorkHero hasProjects={hasProjects} />
        {!hasProjects && <PublishedContent kind="project" fallback={<PortfolioLaunchState/>}/>}
        <FeaturedProjectStories projects={featuredProjects} />
        {hasProjects && <ProjectGallery projects={projects} />}
        <RequirementToResult />
        <OurWorkActions />
        {hasProjects && <PublishedContent kind="project"/>}
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
