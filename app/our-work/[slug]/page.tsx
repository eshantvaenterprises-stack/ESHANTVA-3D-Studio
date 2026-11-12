import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronRight, FileText, ImageIcon, PackageCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { siteConfig } from '@/config/site';
import { getPublishedProjectBySlug, getPublishedProjects } from '@/repositories/projectRepository';

export const dynamicParams = false;

export function generateStaticParams() {
  const projects = getPublishedProjects();

  // Next static export requires at least one parameter for a dynamic route.
  // This reserved build-only value never resolves through the public repository,
  // so it follows the normal not-found path and exposes no project record.
  return projects.length > 0
    ? projects.map((project) => ({ slug: project.slug }))
    : [{ slug: '__empty-portfolio-build__' }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getPublishedProjectBySlug(slug);
  if (!project) return { title: 'Project not found', robots: { index: false, follow: false } };

  const canonical = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/our-work/${project.slug}/` : undefined;
  const primaryImage = project.media.find((media) => media.type === 'image');
  const image = primaryImage && siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}${primaryImage.src}` : undefined;

  return {
    title: project.title,
    description: project.shortDescription,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: true, follow: true },
    openGraph: {
      title: project.title,
      description: project.shortDescription,
      type: 'article',
      url: canonical,
      images: image && primaryImage?.type === 'image' ? [{ url: image, alt: primaryImage.alt }] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getPublishedProjectBySlug(slug);
  if (!project) notFound();

  const pageUrl = siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}/our-work/${project.slug}/` : undefined;
  const publicImageUrls = project.media
    .filter((media) => media.type === 'image')
    .map((media) => siteConfig.siteUrl ? `${siteConfig.siteUrl}${siteConfig.basePath}${media.src}` : media.src);
  const projectJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.shortDescription,
    ...(pageUrl ? { url: pageUrl } : {}),
    ...(publicImageUrls.length ? { image: publicImageUrls } : {}),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', ...(siteConfig.siteUrl ? { item: `${siteConfig.siteUrl}${siteConfig.basePath}/` } : {}) },
      { '@type': 'ListItem', position: 2, name: 'Our Work', ...(siteConfig.siteUrl ? { item: `${siteConfig.siteUrl}${siteConfig.basePath}/our-work/` } : {}) },
      { '@type': 'ListItem', position: 3, name: project.title, ...(pageUrl ? { item: pageUrl } : {}) },
    ],
  };
  const requestHref = project.requestRoute === 'bulk-order' ? '/bulk-order' : '/custom-order';
  const requestLabel = project.requestRoute === 'bulk-order' ? 'Request a Bulk Order' : 'Start a Custom Order';

  return (
    <>
      <SiteHeader />
      <main className="ow-detail">
        <div className="shell ow-detail-breadcrumb">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={14} /><Link href="/our-work">Our Work</Link><ChevronRight size={14} /><span aria-current="page">{project.title}</span></nav>
        </div>

        <section className="shell ow-detail-hero">
          <div><span className="section-kicker">{project.category}</span><h1>{project.title}</h1><p>{project.shortDescription}</p></div>
          <dl>
            {project.startingPoint && <div><dt>Starting Point</dt><dd>{project.startingPoint}</dd></div>}
            {project.serviceType && <div><dt>Service</dt><dd>{project.serviceType}</dd></div>}
            {project.materialLabel && <div><dt>Material Category</dt><dd>{project.materialLabel}</dd></div>}
            {project.quantityLabel && <div><dt>Quantity</dt><dd>{project.quantityLabel}</dd></div>}
          </dl>
        </section>

        <section className="shell ow-detail-media" aria-label="Approved project media">
          {project.media.map((media, index) => media.type === 'image' ? (
            <figure key={`${media.src}-${index}`}><div><Image src={media.src} alt={media.alt} fill sizes="(max-width: 800px) 100vw, 66vw" priority={index === 0} /></div></figure>
          ) : (
            <figure key={`${media.src}-${index}`}><video controls preload="metadata" poster={media.poster}><source src={media.src} /></video><figcaption className="sr-only">Project video for {project.title}</figcaption></figure>
          ))}
          {project.media.length === 0 && <div className="ow-detail-media-empty"><ImageIcon size={30} /><span>Approved project media is unavailable.</span></div>}
        </section>

        <section className="section ow-story">
          <div className="shell ow-story-grid">
            <article><span>01</span><FileText size={21} /><h2>Starting Point</h2><p>{project.startingPoint || 'Approved starting-point information was not published for this project.'}</p></article>
            <article><span>02</span><PackageCheck size={21} /><h2>Requirement</h2><p>{project.requirementSummary || project.shortDescription}</p></article>
            <article><span>03</span><ArrowRight size={21} /><h2>Result</h2><p>{project.resultSummary || 'The approved public result summary is intentionally limited to the information shown here.'}</p></article>
          </div>
        </section>

        <section className="ow-project-cta shell">
          <div><span className="section-kicker">NEED SOMETHING SIMILAR?</span><h2>Start with your own requirement.</h2><p>Share what you have. Feasibility, scope and pricing are reviewed for your specific request.</p></div>
          <Link className="button button-primary" href={requestHref}>{requestLabel} <ArrowRight size={16} /></Link>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
