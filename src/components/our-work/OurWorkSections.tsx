import Link from 'next/link';
import { ArrowRight, Boxes, FileCheck2, Layers3, MoveRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import type { PublicProject } from '@/types/project';
import { retailVisibility } from '@/config/retailVisibility';

export function OurWorkHero({ hasProjects }: { hasProjects: boolean }) {
  return (
    <section className="ow-hero">
      <div className="shell ow-hero-grid">
        <div>
          <span className="section-kicker">OUR WORK</span>
          <h1>See how requirements become physical results.</h1>
        </div>
        <div className="ow-hero-copy">
          <p>{hasProjects
            ? 'A growing collection of selected ESHANTVA products, custom requests and production work approved for public display.'
            : 'Our project gallery is being built from verified ESHANTVA work. As completed work becomes available for public display, selected projects will appear here.'}</p>
          <div className="ow-hero-signal"><ShieldCheck size={18} aria-hidden="true" /><span>Only verified, publication-approved work is shown as portfolio work.</span></div>
        </div>
      </div>
    </section>
  );
}

export function PortfolioLaunchState() {
  return (
    <section className="section ow-launch" aria-labelledby="portfolio-launch-title">
      <div className="shell ow-launch-grid">
        <div className="ow-launch-mark" aria-hidden="true"><FileCheck2 size={43} /><span>VERIFIED<br />WORK ONLY</span></div>
        <div>
          <span className="section-kicker">PORTFOLIO AVAILABILITY</span>
          <h2 id="portfolio-launch-title">The gallery starts with proof, not filler.</h2>
          <p>We are not using stock images, generated mockups or development samples as completed ESHANTVA projects. Until approved project media is ready, this page helps you understand what information can become a real production request.</p>
          <div className="ow-launch-actions">
            {retailVisibility.isInternal && <Link className="button button-primary" href="/shop">Browse Products <ArrowRight size={16} /></Link>}
            <Link className="button button-secondary" href="/custom-order">Start a Custom Order</Link>
            <Link className="text-link" href="/services">Explore Services <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturedProjectStories({ projects }: { projects: PublicProject[] }) {
  if (projects.length === 0) return null;

  return (
    <section className="section ow-featured" aria-labelledby="featured-projects-title">
      <div className="shell">
        <div className="ow-section-heading">
          <div><span className="section-kicker">PROJECT STORIES</span><h2 id="featured-projects-title">Selected requirement-to-result stories.</h2></div>
          <p>More than an image wall: each story shows the customer&apos;s starting point, the need and the approved physical outcome.</p>
        </div>
        <div className="ow-featured-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </div>
    </section>
  );
}

export function RequirementToResult() {
  const paths = [
    { index: '01', icon: Layers3, start: 'FILE', middle: 'REVIEW', end: 'RESULT' },
    { index: '02', icon: Boxes, start: 'DRAWING', middle: 'REVIEW', end: 'RESULT' },
    { index: '03', icon: Sparkles, start: 'IDEA', middle: 'DEFINE + REVIEW', end: 'RESULT' },
  ];

  return (
    <section className="section section-dark ow-pathway" aria-labelledby="requirement-result-title">
      <div className="shell">
        <div className="ow-section-heading ow-section-heading-dark">
          <div><span className="section-kicker">FROM REQUIREMENT TO RESULT</span><h2 id="requirement-result-title">Different starting points. One practical next step.</h2></div>
          <p>You do not need to arrive with a finished 3D model. Start with the information you already have and the requirement can be reviewed from there.</p>
        </div>
        <div className="ow-path-grid">
          {paths.map(({ index, icon: Icon, start, middle, end }) => (
            <article key={index}>
              <div className="ow-path-top"><span>{index}</span><Icon size={21} aria-hidden="true" /></div>
              <div className="ow-path-flow"><strong>{start}</strong><MoveRight aria-hidden="true" /><span>{middle}</span><MoveRight aria-hidden="true" /><strong>{end}</strong></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OurWorkActions() {
  return (
    <>
      <section className="ow-capability-link">
        <div className="shell"><div><span className="section-kicker">CAPABILITIES</span><h2>Looking for a specific capability?</h2></div><Link className="button button-secondary" href="/services">Explore Services &amp; Capabilities <ArrowRight size={16} /></Link></div>
      </section>
      <section className="section ow-request-routes">
        <div className="shell ow-request-grid">
          <article><span>01 / CUSTOM</span><h2>Have a result in mind?</h2><p>Share the information you already have and describe what you need.</p><Link className="button button-primary" href="/custom-order">Start a Custom Order <ArrowRight size={16} /></Link></article>
          <article><span>02 / MULTIPLE UNITS</span><h2>Need multiple units?</h2><p>Use the bulk route when the requirement involves repeated products or a small production batch.</p><Link className="button button-secondary" href="/bulk-order">Start a Bulk Enquiry <ArrowRight size={16} /></Link></article>
        </div>
      </section>
      <section className="ow-final-cta shell"><div><span className="section-kicker">START WITH WHAT YOU HAVE</span><h2>Turn a requirement into the next reviewable step.</h2></div><Link className="button button-primary" href="/custom-order">Start Your Request <ArrowRight size={16} /></Link></section>
    </>
  );
}
